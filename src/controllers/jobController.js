import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { jobQueueService } from "../services/JobQueueService.js";
import { youtubeService } from "../services/YouTubeService.js";
import { AudioProcessingService } from "../services/AudioProcessingService.js";
import { isValidPreset } from "../models/Preset.js";
import { STORAGE } from "../utils/storage.js";
import * as r2 from "../../storage/r2.js";

const audioService = new AudioProcessingService(() => STORAGE.base);

function mapStatus(s) {
  if (s === "PENDING") return "WAITING";
  if (["DOWNLOADING", "EXTRACTING", "PROCESSING"].includes(s)) return "PROCESSING";
  if (s === "DONE") return "DONE";
  return "ERROR";
}

export const jobController = {
  async createJob(req, res) {
    try {
      const user = req.user; // from authRequired
      const { url, preset } = req.body || {};

      if (!url || !preset) return res.status(400).json({ error: "missing_fields" });
      if (!isValidPreset(preset)) return res.status(400).json({ error: "invalid_preset" });

      // Free plan: in-memory only
      if (user?.plan !== "free") {
        // future: persist job
      }

      // For now only YouTube URLs supported to keep system lean
      if (!youtubeService.isYouTubeUrl(url)) {
        return res.status(400).json({ error: "url_not_supported" });
      }

      const jobId = nanoid(10);
      const job = jobQueueService.createJob(jobId);
      job.in = url;
      job.metadata.preset = preset;
      // Usar email como identificador do usuário
      job.userId = user?.email || user?._id || 'anonymous';
      job.metadata.userId = job.userId;

      jobQueueService.enqueueJob(jobId);
      // background processing
      process.nextTick(() => jobController._processQueue());

      return res.status(201).json({ jobId });
    } catch (err) {
      return res.status(500).json({ error: "create_failed", message: err.message });
    }
  },

  async getStatus(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);
    if (!job) return res.status(404).json({ error: "not_found" });

    const out = {
      jobId: job.id,
      status: mapStatus(job.status),
      progress: job.progress,
      error: job.error,
    };
    return res.json(out);
  },

  async download(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);
    if (!job) return res.status(404).send("not found");
    if (job.status !== "DONE") return res.status(400).send("not ready");

    // Se o job tem URL do R2, redireciona direto
    if (job.out && job.out.startsWith('http')) {
      console.log(`[${id}] Redirecting to R2: ${job.out}`);
      return res.redirect(job.out);
    }

    // Fallback: arquivo local (jobs antigos)
    const filePath = job.out;
    if (!fs.existsSync(filePath)) return res.status(404).send("file missing");

    const fileSize = fs.statSync(filePath).size;
    const downloadName = job.filename || path.basename(filePath);

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", `inline; filename="${downloadName}"`);
    res.set("Content-Length", fileSize);

    return res.sendFile(filePath);
  },

  async deleteTemp(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);
    if (!job) return res.status(404).json({ error: "not_found" });

    try {
      if (job.out && fs.existsSync(job.out)) fs.unlinkSync(job.out);
      // Optionally remove from memory to avoid leaks
      // but keep minimal info
      job.out = null;
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: "delete_failed", message: e.message });
    }
  },

  async _processQueue() {
    while (jobQueueService.canProcessMore() && jobQueueService.queue.length > 0) {
      const jobId = jobQueueService.dequeueJob();
      if (!jobId) break;
      const job = jobQueueService.getJob(jobId);
      if (!job || job.status !== "PENDING") continue;

      jobQueueService.incrementActive();
      jobController
        ._processJob(jobId)
        .catch((err) => {
          jobQueueService.failJob(jobId, err.message);
        })
        .finally(() => {
          jobQueueService.decrementActive();
          jobController._processQueue();
        });
    }
  },

  async _processJob(jobId) {
    const job = jobQueueService.getJob(jobId);
    if (!job) return;

    try {
      const url = job.in;
      const preset = job.metadata.preset;

      job.start();

      // metadata
      job.status = "EXTRACTING";
      const metadata = await youtubeService.getMetadata(url, jobId);
      job.metadata = { ...job.metadata, ...metadata };
      const duration = typeof metadata.duration === "number" ? metadata.duration : parseFloat(metadata.duration) || 0;

      // process com upload para R2 (novo fluxo)
      job.status = "PROCESSING";
      console.log(`[${jobId}] Processando com upload para R2`);
      
      const audioStream = youtubeService.getAudioStream(url, jobId);
      
      // Obter userId do contexto (se disponível)
      const userId = job.userId || 'anonymous';
      
      // Processar e fazer upload para R2
      const r2Result = await audioService.processAndUploadToR2(
        audioStream,
        jobId,
        userId,
        preset,
        duration,
        metadata.title
      );

      // Atualizar job com informações do R2
      job.out = r2Result.publicUrl; // URL pública do R2
      job.r2Key = r2Result.key; // Chave no R2
      job.filename = path.basename(r2Result.key);

      console.log(`[${jobId}] Upload concluído: ${r2Result.publicUrl}`);

      jobQueueService.completeJob(jobId);
    } catch (err) {
      console.error(`[${jobId}] Erro no processamento:`, err);
      jobQueueService.failJob(jobId, err.message);
    }
  },
};
