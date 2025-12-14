import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { jobQueueService } from "../services/JobQueueService.js";
import { youtubeService } from "../services/YouTubeService.js";
import { AudioProcessingService } from "../services/AudioProcessingService.js";
import { isValidPreset } from "../models/Preset.js";
import { User } from "../models/User.js";
import {
  MAX_AUDIO_DURATION_MINUTES,
  isDurationTooLong,
  buildDurationLimitMessage,
} from "../config/audioLimits.js";
import { STORAGE } from "../utils/storage.js";
import * as r2 from "../../storage/r2.js";
import {
  getUserIdentity,
  sanitizePresetInput,
  sanitizeUrlInput,
} from "../config/security.js";
import {
  getPlanDisplayName,
  isPresetAllowedForPlan,
  prepareUsageReservation,
} from "../utils/planAccess.js";

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
      const url = sanitizeUrlInput(req.body?.url);
      const preset = sanitizePresetInput(req.body?.preset);

      if (!url || !preset) return res.status(400).json({ error: "missing_fields" });
      if (!isValidPreset(preset)) return res.status(400).json({ error: "invalid_preset" });

      let userPlan = user?.plan || "free";
      if (user?._id) {
        const userRecord = await User.findById(user._id).select("plan");
        if (userRecord?.plan) {
          userPlan = userRecord.plan;
        }
      }

      if (!isPresetAllowedForPlan(userPlan, preset)) {
        return res.status(403).json({
          error: "preset_not_available",
          message: `O preset solicitado não faz parte do ${getPlanDisplayName(userPlan)}.`,
        });
      }

      const userSource = user?.email || user?._id || req.ip || "anonymous";
      const userIdentity = getUserIdentity(userSource);
      
      // Verificar limite de uso (banco de dados) - requer autenticação
      if (!user?._id) {
        return res.status(401).json({
          error: "authentication_required",
          message: "Você precisa estar autenticado para processar áudios"
        });
      }
      
      const usageReservation = await prepareUsageReservation(userPlan, user._id);
      if (!usageReservation.allowed) {
        return res.status(429).json({
          error: "plan_limit_reached",
          message: "Limite de processamentos do plano atingido. Tente novamente mais tarde.",
          retryAt: usageReservation.retryAt?.toISOString() || null,
        });
      }

      // Free plan: in-memory only
      if (userPlan !== "free") {
        // future: persist job
      }

      // For now only YouTube URLs supported to keep system lean
      if (!youtubeService.isYouTubeUrl(url)) {
        return res.status(400).json({ error: "url_not_supported" });
      }

      const jobId = nanoid(10);
      const metadata = await youtubeService.getMetadata(url, jobId);
      const duration =
        typeof metadata.duration === "number"
          ? metadata.duration
          : parseFloat(metadata.duration) || 0;

      if (isDurationTooLong(duration)) {
        console.warn(
          `[${jobId}] Audio duration ${duration.toFixed(
            2
          )}s exceeds limit (${MAX_AUDIO_DURATION_MINUTES}min)`
        );
        return res.status(400).json({
          error: "audio_too_long",
          message: buildDurationLimitMessage(duration),
          maxDurationMinutes: MAX_AUDIO_DURATION_MINUTES,
        });
      }

      const job = jobQueueService.createJob(jobId);
      job.in = url;
      job.metadata = {
        ...job.metadata,
        ...metadata,
        preset,
        duration,
        youtubeUrl: url,
        plan: userPlan,
      };
      job.userId = userIdentity.storageKey;
      job.metadata.userStorageKey = userIdentity.storageKey;
      job.metadata.userReference = userIdentity.reference;

      jobQueueService.enqueueJob(jobId);
      // background processing
      process.nextTick(() => jobController._processQueue());

      // Registrar uso no banco de dados
      await usageReservation.commit();

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
      if (!job.metadata) {
        job.metadata = {};
      }

      if (!job.metadata.title || !job.metadata.duration) {
        const fetchedMetadata = await youtubeService.getMetadata(url, jobId);
        job.metadata = { ...job.metadata, ...fetchedMetadata };
      }

      const duration = typeof job.metadata.duration === "number"
        ? job.metadata.duration
        : parseFloat(job.metadata.duration) || 0;

      job.metadata.duration = duration;
      job.metadata.youtubeUrl = job.metadata.youtubeUrl || url;

      if (isDurationTooLong(duration)) {
        console.warn(
          `[${jobId}] Abortando: duração ${duration.toFixed(
            2
          )}s acima do limite (${MAX_AUDIO_DURATION_MINUTES}min)`
        );
        throw new Error(buildDurationLimitMessage(duration));
      }

      // process com upload para R2 (novo fluxo)
      job.status = "PROCESSING";
      
      const audioStream = youtubeService.getAudioStream(url, jobId);
      
      // Obter userId do contexto (se disponível)
      const userId = job.userId || "anonymous";
      
      // Processar e fazer upload para R2
      const r2Result = await audioService.processAndUploadToR2(
        audioStream,
        jobId,
        userId,
        preset,
        duration,
        job.metadata?.title
      );

      // Atualizar job com informações do R2
      job.out = r2Result.publicUrl; // URL pública do R2
      job.r2Key = r2Result.key; // Chave no R2
      job.filename = path.basename(r2Result.key);

      jobQueueService.completeJob(jobId);
    } catch (err) {
      console.error(`[${jobId}] Erro no processamento:`, err);
      jobQueueService.failJob(jobId, err.message);
    }
  },
};
