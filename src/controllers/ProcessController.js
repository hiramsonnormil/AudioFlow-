/**
 * Controller: Process Controller
 * Gerencia os endpoints de processamento de áudio
 */

import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { jobQueueService } from "../services/JobQueueService.js";
import { youtubeService } from "../services/YouTubeService.js";
import { AudioProcessingService } from "../services/AudioProcessingService.js";
import { isValidPreset } from "../models/Preset.js";
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

  /**
   * POST /process - Criar novo job de processamento
   */
  async startProcess(req, res) {
    const url = sanitizeUrlInput(req.body?.url);
    const preset = sanitizePresetInput(req.body?.preset);

    // Validações
    if (!url || !preset) {
      return res.status(400).json({ error: "Missing url or preset" });
    }

    if (!youtubeService.isYouTubeUrl(url)) {
      return res.status(400).json({ error: "URL must be YouTube" });
    }

    if (!isValidPreset(preset)) {
      return res.status(400).json({ error: "Invalid preset" });
    }

    const jobId = nanoid(10);

    // Obter metadados para validar duração antes de enfileirar
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

    // Criar job
    const job = jobQueueService.createJob(jobId);
    job.in = url;
    job.metadata = {
      ...job.metadata,
      ...metadata,
      preset,
      duration,
      youtubeUrl: url,
    };
    
    // Salvar userId se houver autenticação (usa email como identificador)
    const userSource = req.user?.email || req.user?._id || req.ip || "anonymous";
    const userIdentity = getUserIdentity(userSource);

    job.metadata = job.metadata || {};
    job.userId = userIdentity.storageKey;
    job.metadata.userStorageKey = userIdentity.storageKey;
    job.metadata.userReference = userIdentity.reference;

    // Enfileirar
    jobQueueService.enqueueJob(jobId);

    // Tentar processar a fila
    this.processQueue();

    res.json({ id: jobId });
  }

  /**
   * GET /status/:id - Obter status do job
   */
  getStatus(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const result = job.toJSON();
    
    // Incluir nome formatado para download no resultado
    if (job.status === "DONE") {
      result.downloadFilename = job.getFormattedDownloadFilename();
      result.preset = job.metadata?.preset || null;
    }

    if (job.status === "DONE" && job.out) {
      // Se o arquivo está no R2 (URL começa com http), não precisa verificar filesystem
      if (job.out.startsWith('http')) {
        result.output = `/file/${job.id}`;
        result.fileExists = true; // Assumimos que existe, o R2 gerencia a expiração
        result.r2Key = job.r2Key || null;
        
        // Calcular tempo de expiração (1 hora a partir da conclusão)
        if (job.completedAt) {
          const ONE_HOUR = 60 * 60 * 1000; // 1 hora em ms
          const now = new Date();
          const completedTime = new Date(job.completedAt).getTime();
          const expiresAt = completedTime + ONE_HOUR;
          const expiresIn = Math.max(0, expiresAt - now.getTime());
          
          result.expiresAt = new Date(expiresAt).toISOString();
          result.expiresIn = expiresIn; // Tempo restante em ms
          result.isExpired = expiresIn <= 0;
        }
      } else if (fs.existsSync(job.out)) {
        // Fallback para arquivos locais (jobs antigos)
        result.output = `/file/${job.id}`;
        result.fileSize = fs.statSync(job.out).size;
        result.fileExists = true;
      }
    }

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(result);
  }

  /**
   * GET /queue-stats - Obter estatísticas da fila
   */
  getQueueStats(req, res) {
    const stats = jobQueueService.getStats();
    res.json(stats);
  }

  /**
   * GET /presets - Listar presets disponíveis
   */
  async getPresets(req, res) {
    const { getEnabledPresets } = await import("../models/Preset.js");
    const presets = getEnabledPresets();
    res.json(presets);
  }

  /**
   * GET /file/:id - Fazer download do arquivo processado
   * ATUALIZADO: Baixa do R2 usando autenticação S3
   */
  async downloadFile(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    if (!job) {
      console.error(`[DEBUG] Job ${id} not found`);
      return res.status(404).send("not found");
    }

    if (job.status !== "DONE") {
      console.error(`[DEBUG] Job ${id} not ready. Status: ${job.status}`);
      return res.status(400).send("not ready");
    }

    // Se o job tem URL do R2, baixar com autenticação S3
    if (job.out && job.out.startsWith('http')) {
      try {
        // Extrair a key do R2 da URL
        const key = r2.extractKeyFromUrl(job.out);
        
        if (!key) {
          console.error(`[DEBUG] Failed to extract key from URL: ${job.out}`);
          return res.status(500).send("Invalid R2 URL");
        }
        
        // Baixar arquivo do R2 com autenticação
        const stream = await r2.downloadFile(key);
        
        // Usar nome formatado: nomedamusica-presetaplicado-diadoprocessamento.mp3
        const downloadName = job.getFormattedDownloadFilename();
        
        res.set("Content-Type", "audio/mpeg");
        res.set("Content-Disposition", `attachment; filename="${downloadName}"`);
        res.set("Cache-Control", "public, max-age=3600");
        res.set("Accept-Ranges", "bytes");
        
        // Pipe do stream do R2 direto para o response
        stream.pipe(res);
        
        stream.on('error', (err) => {
          console.error(`[DEBUG] Stream error:`, err);
          if (!res.headersSent) {
            res.status(500).send("Error streaming file");
          }
        });
        
        return;
      } catch (err) {
        console.error(`[DEBUG] Error downloading from R2:`, err);
        return res.status(500).send("Error loading file from storage");
      }
    }

    // Fallback: Se ainda tiver arquivo local (jobs antigos)
    const filePath = job.out;

    if (!fs.existsSync(filePath)) {
      console.error(`[DEBUG] File not found at: ${filePath}`);
      return res.status(404).send(`file not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    // Usar nome formatado: nomedamusica-presetaplicado-diadoprocessamento.mp3
    const downloadName = job.getFormattedDownloadFilename();

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", `attachment; filename="${downloadName}"`);
    res.set("Content-Length", fileSize);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[DEBUG] Error sending file: ${err.message}`);
      }
    });
  }

  /**
   * Processa a fila de jobs
   */
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
          this.processQueue(); // Processar próximo
        });
    }
  }

  /**
   * Processa um job específico
   */
  async processJob(jobId) {
    const job = jobQueueService.getJob(jobId);
    if (!job) return;

    try {
      const url = job.in;
      const preset = job.metadata.preset;
      const outputDir = path.join(this.storagePath, "out");

      job.start();

      // Step 1: Extrair metadados
      job.status = "EXTRACTING";
      if (!job.metadata) {
        job.metadata = {};
      }

      if (!job.metadata.title || !job.metadata.duration) {
        const fetchedMetadata = await youtubeService.getMetadata(url, jobId);
        job.metadata = { ...job.metadata, ...fetchedMetadata };
      }

      const duration =
        typeof job.metadata.duration === "number"
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
      job.progress = 10;

      // Step 2: Processar e fazer upload para R2 (novo fluxo)
      job.status = "PROCESSING";
      job.progress = 15;

      const audioStream = youtubeService.getAudioStream(url, jobId);
      
      // Obter userId do job (se foi definido ao criar) ou usar 'anonymous'
      // Usar email como identificador principal
      const userId = job.userId || job.metadata?.userStorageKey || "anonymous";
      
      // Usar o novo método que faz tudo: processa + upload R2 + deleta local
      const r2Result = await this.audioService.processAndUploadToR2(
        audioStream,
        jobId,
        userId,
        preset,
        duration,
        job.metadata?.title
      );

      job.progress = 95;

      // Atualizar job com informações do R2
      job.out = r2Result.publicUrl; // URL pública do R2
      job.r2Key = r2Result.key; // Chave no R2
      job.filename = path.basename(r2Result.key); // Nome do arquivo

      // Step 5: Completar job
      jobQueueService.completeJob(jobId);
    } catch (err) {
      console.error(`[${jobId}] Error:`, err.message);
      jobQueueService.failJob(jobId, err.message);
    }
  }
}
