/**
 * Service: Job Queue Manager
 * Gerencia a fila de processamento de jobs com persistência em MongoDB
 */

import { Job as JobModel } from "../models/Job.js";
import { Job as JobSchema } from "../models/schemas/Job.js";
import { nanoid } from "nanoid";

// Classe wrapper para manter compatibilidade com a API antiga
class JobWrapper {
  constructor(data) {
    this.id = data.jobId;
    this.status = data.status;
    this.progress = data.progress;
    this.in = data.inputUrl;
    this.out = data.outputPath;
    this.error = data.error;
    this.metadata = {
      title: data.metadata?.title,
      thumbnail: data.metadata?.thumbnail,
      duration: data.metadata?.duration,
      videoId: data.metadata?.videoId,
      preset: data.preset,
    };
    this.filename = data.filename;
    this.createdAt = data.createdAt;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this._dbDoc = data; // Referência ao documento MongoDB
  }

  start() {
    this.status = "DOWNLOADING";
    this.startedAt = new Date();
    this.progress = 0;
  }

  complete() {
    this.status = "DONE";
    this.progress = 100;
    this.completedAt = new Date();
  }

  fail(errorMessage) {
    this.status = "ERROR";
    this.error = errorMessage;
    this.completedAt = new Date();
  }

  getProcessingTime() {
    if (!this.startedAt) return null;
    const end = this.completedAt || new Date();
    return Math.round((end - this.startedAt) / 1000);
  }

  isFinished() {
    return this.status === "DONE" || this.status === "ERROR";
  }

  toJSON() {
    return {
      id: this.id,
      status: this.status,
      progress: this.progress,
      title: this.metadata.title,
      filename: this.filename,
      filePath: this.out,
      thumbnail: this.metadata.thumbnail,
      videoId: this.metadata.videoId,
      error: this.error,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
    };
  }
}

export class JobQueueService {
  constructor(maxConcurrent = 10) {
    this.queue = []; // Fila em memória de IDs aguardando
    this.activeJobs = 0; // Contador de jobs ativos
    this.maxConcurrent = maxConcurrent;
    this.statistics = {
      totalProcessed: 0,
      totalErrors: 0,
      totalSuccess: 0,
    };
  }

  /**
   * Cria e enfileira um novo job (compatível com a versão anterior)
   */
  createJob(jobId, userId = "default-user") {
    const job = new JobModel(jobId); // Usar Job.js para compatibilidade
    // Retornar wrapper que irá persistir depois
    return job;
  }

  /**
   * Obtém um job pelo ID do MongoDB
   */
  async getJob(id) {
    try {
      const doc = await JobSchema.findOne({ jobId: id });
      if (!doc) return null;
      return new JobWrapper(doc);
    } catch (error) {
      console.error(`Erro ao obter job ${id}:`, error.message);
      return null;
    }
  }

  /**
   * Enfileira um job para processamento
   */
  async enqueueJob(jobId, jobData = {}) {
    try {
      // Persistir no MongoDB
      const dbJob = await JobSchema.create({
        jobId,
        userId: jobData.userId || "default-user",
        status: "PENDING",
        inputUrl: jobData.url || "",
        preset: jobData.preset || "SLOWED",
        metadata: jobData.metadata || {},
      });

      this.queue.push(jobId);
      console.log(
        `[QUEUE] Job ${jobId} enqueued. Queue size: ${this.queue.length}`
      );
      return true;
    } catch (error) {
      console.error(`Erro ao enfileirar job ${jobId}:`, error.message);
      return false;
    }
  }

  /**
   * Remove um job da fila
   */
  dequeueJob() {
    if (this.queue.length === 0) return null;
    return this.queue.shift();
  }

  /**
   * Incrementa contador de jobs ativos
   */
  incrementActive() {
    this.activeJobs++;
  }

  /**
   * Decrementa contador de jobs ativos
   */
  decrementActive() {
    if (this.activeJobs > 0) {
      this.activeJobs--;
    }
  }

  /**
   * Verifica se pode processar mais jobs
   */
  canProcessMore() {
    return this.activeJobs < this.maxConcurrent;
  }

  /**
   * Retorna estatísticas da fila
   */
  async getStats() {
    try {
      const pending = await JobSchema.countDocuments({ status: "PENDING" });
      const processing = await JobSchema.countDocuments({
        status: { $in: ["DOWNLOADING", "EXTRACTING", "PROCESSING"] },
      });
      const done = await JobSchema.countDocuments({ status: "DONE" });
      const error = await JobSchema.countDocuments({ status: "ERROR" });
      const total = await JobSchema.countDocuments();

      return {
        total,
        pending,
        processing,
        done,
        error,
        activeJobs: this.activeJobs,
        maxConcurrent: this.maxConcurrent,
        queueLength: this.queue.length,
        statistics: this.statistics,
      };
    } catch (error) {
      console.error("Erro ao obter estatísticas:", error.message);
      return {
        total: 0,
        pending: 0,
        processing: 0,
        done: 0,
        error: 0,
        activeJobs: this.activeJobs,
        maxConcurrent: this.maxConcurrent,
        queueLength: this.queue.length,
        statistics: this.statistics,
      };
    }
  }

  /**
   * Marca um job como concluído com sucesso
   */
  async completeJob(jobId) {
    try {
      const job = await JobSchema.findOneAndUpdate(
        { jobId },
        {
          status: "DONE",
          progress: 100,
          completedAt: new Date(),
        },
        { new: true }
      );

      if (job) {
        this.statistics.totalSuccess++;
        this.statistics.totalProcessed++;
      }

      return job;
    } catch (error) {
      console.error(`Erro ao completar job ${jobId}:`, error.message);
      return null;
    }
  }

  /**
   * Marca um job como erro
   */
  async failJob(jobId, errorMessage) {
    try {
      const job = await JobSchema.findOneAndUpdate(
        { jobId },
        {
          status: "ERROR",
          error: errorMessage,
          completedAt: new Date(),
        },
        { new: true }
      );

      if (job) {
        this.statistics.totalErrors++;
        this.statistics.totalProcessed++;
      }

      return job;
    } catch (error) {
      console.error(`Erro ao falhar job ${jobId}:`, error.message);
      return null;
    }
  }

  /**
   * Limpa jobs antigos (mais de X horas)
   */
  async cleanupOldJobs(hoursThreshold = 24) {
    try {
      const threshold = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

      const result = await JobSchema.deleteMany({
        status: { $in: ["DONE", "ERROR"] },
        completedAt: { $lt: threshold },
      });

      console.log(`🧹 Limpeza: ${result.deletedCount} jobs antigos removidos`);
      return result.deletedCount;
    } catch (error) {
      console.error("Erro ao limpar jobs antigos:", error.message);
      return 0;
    }
  }

  /**
   * Atualiza progresso do job
   */
  async updateProgress(jobId, progress, status = null) {
    try {
      const updateData = { progress };
      if (status) updateData.status = status;

      const job = await JobSchema.findOneAndUpdate(
        { jobId },
        updateData,
        { new: true }
      );

      return job;
    } catch (error) {
      console.error(`Erro ao atualizar progresso de ${jobId}:`, error.message);
      return null;
    }
  }

  /**
   * Atualiza dados de saída do job
   */
  async updateJobOutput(jobId, outputPath, filename, fileSize = 0) {
    try {
      const job = await JobSchema.findOneAndUpdate(
        { jobId },
        {
          outputPath,
          filename,
          fileSize,
        },
        { new: true }
      );

      return job;
    } catch (error) {
      console.error(`Erro ao atualizar output de ${jobId}:`, error.message);
      return null;
    }
  }

  /**
   * Obtém jobs de um usuário
   */
  async getJobsByUser(userId, status = null, limit = 10) {
    try {
      const query = { userId };
      if (status) query.status = status;

      const jobs = await JobSchema.find(query)
        .sort({ createdAt: -1 })
        .limit(limit);

      return jobs.map((doc) => new JobWrapper(doc));
    } catch (error) {
      console.error(`Erro ao obter jobs do usuário ${userId}:`, error.message);
      return [];
    }
  }
}

// Singleton instance
export const jobQueueService = new JobQueueService(10);
