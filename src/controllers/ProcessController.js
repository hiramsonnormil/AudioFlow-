/**
 * Controller: Process Controller
 * Gerencia os endpoints de processamento de áudio
 */

import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";
import { jobQueueService } from "../services/JobQueueService.js";
import { youtubeService } from "../services/YouTubeService.js";
import { AudioProcessingService } from "../services/AudioProcessingService.js";
import { isValidPreset } from "../models/Preset.js";
import { fileURLToPath } from "url";

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
    const { url, preset } = req.body || {};

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

    // Criar job
    const jobId = nanoid(10);
    const job = jobQueueService.createJob(jobId);
    job.in = url;
    job.metadata.preset = preset;

    // Enfileirar
    jobQueueService.enqueueJob(jobId);

    console.log(`[${jobId}] New job created: ${preset} from ${url}`);

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

    if (job.status === "DONE" && job.out && fs.existsSync(job.out)) {
      result.output = `/file/${job.id}`;
      result.fileSize = fs.statSync(job.out).size;
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
   * GET /file/:id - Fazer download do arquivo processado
   */
  downloadFile(req, res) {
    const { id } = req.params;
    const job = jobQueueService.getJob(id);

    console.log(`[DEBUG] GET /file/${id}`);

    if (!job) {
      console.error(`[DEBUG] Job ${id} not found`);
      return res.status(404).send("not found");
    }

    if (job.status !== "DONE") {
      console.error(`[DEBUG] Job ${id} not ready. Status: ${job.status}`);
      return res.status(400).send("not ready");
    }

    const filePath = job.out;

    if (!fs.existsSync(filePath)) {
      console.error(`[DEBUG] File not found at: ${filePath}`);
      return res.status(404).send(`file not found: ${filePath}`);
    }

    const fileSize = fs.statSync(filePath).size;
    const downloadName = job.filename || path.basename(filePath);

    console.log(
      `[DEBUG] Serving file: ${filePath} (${fileSize} bytes) as ${downloadName}`
    );

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", `inline; filename="${downloadName}"`);
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
      console.log(`[${jobId}] Extracting metadata...`);
      job.status = "EXTRACTING";
      const metadata = await youtubeService.getMetadata(url, jobId);
      job.metadata = { ...job.metadata, ...metadata };
      const duration =
        typeof metadata.duration === "number"
          ? metadata.duration
          : parseFloat(metadata.duration) || 0;
      job.progress = 10;

      // Step 2: Gerar nome de arquivo único
      const filename = this.audioService.generateUniqueFilename(
        metadata.title,
        preset,
        outputDir
      );
      const outPath = path.join(outputDir, filename);
      job.out = outPath;
      job.filename = filename;

      console.log(`[${jobId}] Output: ${filename}`);

      // Step 3: Construir filtro de áudio
      const audioFilterStr = this.audioService.buildAudioFilter(
        preset,
        duration
      );
      console.log(
        `[${jobId}] Audio filter: ${audioFilterStr.substring(0, 80)}...`
      );

      // Step 4: Processar com FFmpeg
      job.status = "PROCESSING";
      job.progress = 15;

      const audioStream = youtubeService.getAudioStream(url, jobId);
      await this.audioService.processAudio(
        audioStream,
        outPath,
        audioFilterStr,
        duration,
        jobId
      );

      job.progress = 95;

      // Verificar se arquivo foi criado
      if (!fs.existsSync(outPath)) {
        throw new Error("Output file was not created");
      }

      const fileSize = fs.statSync(outPath).size;
      console.log(`[${jobId}] File created: ${filename} (${fileSize} bytes)`);

      // Step 5: Completar job
      jobQueueService.completeJob(jobId);
      console.log(`[${jobId}] Job completed successfully`);
    } catch (err) {
      console.error(`[${jobId}] Error:`, err.message);
      jobQueueService.failJob(jobId, err.message);
    }
  }
}
