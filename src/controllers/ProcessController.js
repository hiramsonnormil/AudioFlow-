/**
 * Controller: Process Controller
 * Gerencia os endpoints de processamento de áudio (Versão Local)
 */

import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jobQueueService } from "../services/JobQueueService.js";
import { youtubeService } from "../services/YouTubeService.js";
import { AudioProcessingService } from "../services/AudioProcessingService.js";
import {
  MAX_AUDIO_DURATION_MINUTES,
  isDurationTooLong,
  buildDurationLimitMessage,
} from "../config/audioLimits.js";
import * as r2 from "../../storage/r2.js";
import {
  getUserIdentity,
  sanitizePresetInput,
  sanitizeUrlInput,
} from "../config/security.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProcessController {
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.audioService = new AudioProcessingService(storagePath);
    this.activeJobs = 0;
    this.maxConcurrent = 10;
  }

  async startProcess(req, res) {
    const url = sanitizeUrlInput(req.body?.url);
    const preset = sanitizePresetInput(req.body?.preset);

    if (!url || !preset) {
      return res.status(400).json({ error: "Missing url or preset" });
    }

    if (!youtubeService.isYouTubeUrl(url)) {
      return res.status(400).json({ error: "URL must be YouTube" });
    }

    const userIdentity = getUserIdentity(req.ip);
    const jobId = nanoid(10);

    let metadata;
    try {
      metadata = await youtubeService.getMetadata(url, jobId);
    } catch (err) {
      const isBotBlock = err.message.includes("cookies.txt") || err.message.includes("autenticação");
      return res.status(isBotBlock ? 503 : 400).json({
        error: isBotBlock ? "youtube_auth_required" : "metadata_fetch_failed",
        message: err.message,
      });
    }

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
      plan: "local",
    };

    job.userId = userIdentity.storageKey;
    job.metadata.userStorageKey = userIdentity.storageKey;
    job.metadata.userReference = userIdentity.reference;

    jobQueueService.enqueueJob(jobId);
    this.processQueue();

    res.json({ id: jobId });
  }

  getStatus(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const result = job.toJSON();
    result.tier = "premium"; // always premium features locally

    if (job.status === "DONE") {
      result.downloadFilename = job.getFormattedDownloadFilename();
      result.preset = job.metadata?.preset || null;
    }

    if (job.status === "DONE" && job.out) {
      if (job.out.startsWith('http')) {
        result.output = `/file/${job.id}`;
        result.fileExists = true;
        result.r2Key = job.r2Key || null;

        if (job.completedAt) {
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          const expirationTime = TWENTY_FOUR_HOURS;

          const now = new Date();
          const completedTime = new Date(job.completedAt).getTime();
          const expiresAt = completedTime + expirationTime;
          const expiresIn = Math.max(0, expiresAt - now.getTime());

          result.expiresAt = new Date(expiresAt).toISOString();
          result.expiresIn = expiresIn;
          result.isExpired = expiresIn <= 0;
        }
      } else if (fs.existsSync(job.out)) {
        result.output = `/file/${job.id}`;
        result.fileSize = fs.statSync(job.out).size;
        result.fileExists = true;
        // Mock expiration to bypass UI lock for local files
        result.expiresIn = 24 * 60 * 60 * 1000;
        result.isExpired = false;
      }
    }

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(result);
  }

  getQueueStats(req, res) {
    const stats = jobQueueService.getStats();
    res.json(stats);
  }

  async getPresets(req, res) {
    // Hardcoded presets for local version since DB is removed
    const presets = [
      { id: "SLOWED", name: "Slowed (Vinil Lento)", description: "Desaceleração acoplada, grave reforçado sem estouro, sem aliasing", icon: "🕐", isPremium: false },
      { id: "DAYCORE", name: "Daycore", description: "O 'espelho' do Nightcore: sonolento, pesado e turvo", icon: "☀️", isPremium: false },
      { id: "NIGHTCORE", name: "Speed Up / Nightcore", description: "Aceleração limpa, controle de aspereza de agudos", icon: "🌟", isPremium: false },
      { id: "MUFFLED", name: "Abafado", description: "Atenuação progressiva de parede com recuperação de RMS", icon: "🔇", isPremium: false },
      { id: "MUFFLED_SLOWED", name: "Muffled Slowed", description: "Lento e abafado perfeitamente mesclados em pipeline único", icon: "🌫️", isPremium: false },
      { id: "MUFFLED_SPEED", name: "Muffled Speed", description: "Rápido e abafado mesclados (evita a estridência do Nightcore bruto)", icon: "🔊", isPremium: false },
      { id: "8D_AUDIO", name: "Áudio 8D", description: "Panorâmica oscilante equilibrada + espacialização real", icon: "🎧", isPremium: false },
      { id: "LOFI", name: "Lo-Fi (Cassete/Vinil)", description: "Wow sutil, bitcrush analógico e saturação oversampled", icon: "📻", isPremium: false },
      { id: "BASS_BOOST", name: "Grave Reforçado", description: "Dupla compressão serial (peak+rms) para grave monstruoso", icon: "🎸", isPremium: false },
      { id: "VINTAGE_RADIO", name: "Rádio Vintage/AM", description: "Filtros de 1 polo e presença comprimida de broadcast", icon: "🎙️", isPremium: false },
      { id: "REVERB_HALL", name: "Câmara/Hall Ambiente", description: "Reflexões duplas (iniciais+cauda) com atenuação do ar", icon: "🏛️", isPremium: false },
      { id: "ROBOTIC", name: "Robótico", description: "Modulação ring-mod (tremolo 45Hz) e phaser metálico", icon: "🤖", isPremium: false },
      { id: "UNDERWATER", name: "Subaquático", description: "Filtro ressonante com vibrato de correnteza e difusão líquida", icon: "🌊", isPremium: false },
      { id: "STADIUM", name: "Estádio/Arena", description: "Reverb massivo alargado com contenção de rugido grave", icon: "🏟️", isPremium: false },
      { id: "CLARITY_ENHANCE", name: "Clareza/Realce", description: "Crystalizer e EQs paramétricos para brilho de masterização", icon: "✨", isPremium: false }
    ];
    res.json(presets);
  }

  async downloadFile(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).send("not found");
    }
    if (job.status !== "DONE") {
      return res.status(400).send("not ready");
    }

    if (job.out && job.out.startsWith('http')) {
      try {
        const key = r2.extractKeyFromUrl(job.out);
        if (!key) {
          return res.status(500).send("Invalid R2 URL");
        }

        const stream = await r2.downloadFile(key);
        const downloadName = job.getFormattedDownloadFilename();

        res.set("Content-Type", "audio/mpeg");
        res.set("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.set("Cache-Control", "public, max-age=3600");
        res.set("Accept-Ranges", "bytes");

        stream.pipe(res);
        stream.on('error', (err) => {
          if (!res.headersSent) {
            res.status(500).send("Error streaming file");
          }
        });
        return;
      } catch (err) {
        return res.status(500).send("Error loading file from storage");
      }
    }

    const filePath = job.out;
    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`file not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    const downloadName = job.getFormattedDownloadFilename();

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.set("Content-Length", fileSize);
    res.sendFile(filePath);
  }

  async processQueue() {
    while (
      jobQueueService.canProcessMore() &&
      jobQueueService.queue.length > 0
    ) {
      const jobId = jobQueueService.dequeueJob();
      if (!jobId) break;

      const job = jobQueueService.getJob(jobId);
      if (!job || job.status !== "PENDING") continue;

      jobQueueService.incrementActive();

      this.processJob(jobId)
        .catch((err) => {
          console.error(`[${jobId}] Unexpected error:`, err);
          jobQueueService.failJob(jobId, "Unexpected error: " + err.message);
        })
        .finally(() => {
          jobQueueService.decrementActive();
          this.processQueue();
        });
    }
  }

  async processJob(jobId) {
    const job = jobQueueService.getJob(jobId);
    if (!job) return;

    try {
      const url = job.in;
      const preset = job.metadata.preset;

      job.start();
      job.status = "EXTRACTING";

      if (!job.metadata) job.metadata = {};
      if (!job.metadata.title || !job.metadata.duration) {
        const fetchedMetadata = await youtubeService.getMetadata(url, jobId);
        job.metadata = { ...job.metadata, ...fetchedMetadata };
      }

      const duration = typeof job.metadata.duration === "number" ? job.metadata.duration : parseFloat(job.metadata.duration) || 0;
      job.metadata.duration = duration;
      job.metadata.youtubeUrl = job.metadata.youtubeUrl || url;

      if (isDurationTooLong(duration)) {
        throw new Error(buildDurationLimitMessage(duration));
      }
      job.progress = 10;

      job.status = "PROCESSING";
      job.progress = 15;

      const audioStream = youtubeService.getAudioStream(url, jobId);
      const userId = job.userId || job.metadata?.userStorageKey || "anonymous";

      const result = await this.audioService.processAndSaveLocally(
        audioStream,
        jobId,
        preset,
        duration,
        job.metadata?.title
      );

      job.progress = 95;
      job.out = result.publicUrl;
      job.filename = result.filename;

      jobQueueService.completeJob(jobId);
    } catch (err) {
      console.error(`[${jobId}] Error:`, err.message);
      jobQueueService.failJob(jobId, err.message);
    }
  }
  async startVideoGeneration(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (job.status !== "DONE") {
      return res.status(400).json({ error: "Audio process must be DONE first" });
    }
    if (job.videoStatus === "PENDING" || job.videoStatus === "PROCESSING") {
      return res.status(400).json({ error: "Video is already rendering" });
    }

    job.videoStatus = "PROCESSING";
    job.videoProgress = 0;
    job.videoError = null;

    // Run async so it doesn't block response
    this.audioService.generateTikTokVideo(job, jobQueueService).catch(err => {
      console.error(`[${job.id}] Video error:`, err);
    });

    return res.json({ message: "Video generation started", videoStatus: job.videoStatus });
  }

  async downloadVideo(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).send("not found");
    }
    if (job.videoStatus !== "DONE" || !job.videoOut) {
      return res.status(400).send("Video not ready");
    }

    const filePath = job.videoOut;
    if (!fs.existsSync(filePath)) {
      return res.status(404).send(`file not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    const downloadName = job.filename ? job.filename.replace('.mp3', '_tiktok.mp4') : `${job.id}_tiktok.mp4`;

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Content-Type", "video/mp4");
    res.set("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.set("Content-Length", fileSize);
    res.sendFile(filePath);
  }
}
