import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { jobQueueService } from "../services/JobQueueService.js";
import { youtubeService } from "../services/YouTubeService.js";
import { AudioProcessingService } from "../services/AudioProcessingService.js";
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
      const url = sanitizeUrlInput(req.body?.url);
      const preset = sanitizePresetInput(req.body?.preset);

      if (!url || !preset) return res.status(400).json({ error: "missing_fields" });

      const userSource = req.ip || "anonymous";
      const userIdentity = getUserIdentity(userSource);

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
        plan: "local",
      };
      job.userId = userIdentity.storageKey;
      job.metadata.userStorageKey = userIdentity.storageKey;
      job.metadata.userReference = userIdentity.reference;

      jobQueueService.enqueueJob(jobId);
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

    if (job.out && job.out.startsWith('http')) {
      return res.redirect(job.out);
    }

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
        throw new Error(buildDurationLimitMessage(duration));
      }

      job.status = "PROCESSING";
      
      const audioStream = youtubeService.getAudioStream(url, jobId);
      const userId = job.userId || "anonymous";
      
      const result = await audioService.processAndSaveLocally(
        audioStream,
        jobId,
        preset,
        duration,
        job.metadata?.title
      );

      job.out = result.publicUrl;
      job.filename = result.filename;

      jobQueueService.completeJob(jobId);
    } catch (err) {
      console.error(`[${jobId}] Erro no processamento:`, err);
      jobQueueService.failJob(jobId, err.message);
    }
  },
};
