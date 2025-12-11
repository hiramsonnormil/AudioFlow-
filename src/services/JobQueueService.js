/**
 * Service: Job Queue Manager
 * Gerencia a fila de processamento de jobs
 */

import { Job } from "../models/Job.js";

export class JobQueueService {
  constructor(maxConcurrent = 10) {
    this.jobs = new Map(); // Armazena todos os jobs
    this.queue = []; // Fila de jobs aguardando
    this.activeJobs = 0; // Contador de jobs ativos
    this.maxConcurrent = maxConcurrent;
    this.statistics = {
      totalProcessed: 0,
      totalErrors: 0,
      totalSuccess: 0,
    };
    
    // Limpeza automática de jobs antigos a cada 1 hora
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs(2); // Remove jobs com mais de 2 horas
    }, 60 * 60 * 1000); // A cada 1 hora
  }

  /**
   * Cria e enfileira um novo job
   */
  createJob(id) {
    const job = new Job(id);
    this.jobs.set(id, job);
    return job;
  }

  /**
   * Obtém um job pelo ID
   */
  getJob(id) {
    return this.jobs.get(id);
  }

  /**
   * Enfileira um job para processamento
   */
  enqueueJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    this.queue.push(jobId);
    return true;
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
  getStats() {
    let pending = 0;
    let processing = 0;
    let done = 0;
    let error = 0;

    for (const job of this.jobs.values()) {
      if (job.status === "PENDING") pending++;
      else if (["DOWNLOADING", "EXTRACTING", "PROCESSING"].includes(job.status))
        processing++;
      else if (job.status === "DONE") done++;
      else if (job.status === "ERROR") error++;
    }

    return {
      total: this.jobs.size,
      pending,
      processing,
      done,
      error,
      activeJobs: this.activeJobs,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.queue.length,
      statistics: this.statistics,
    };
  }

  /**
   * Marca um job como concluído com sucesso
   */
  completeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.complete();
      this.statistics.totalSuccess++;
      this.statistics.totalProcessed++;
    }
  }

  /**
   * Marca um job como erro
   */
  failJob(jobId, errorMessage) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.fail(errorMessage);
      this.statistics.totalErrors++;
      this.statistics.totalProcessed++;
    }
  }

  /**
   * Limpa jobs antigos (mais de 24 horas)
   */
  cleanupOldJobs(hoursThreshold = 24) {
    const now = new Date();
    const threshold = hoursThreshold * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, job] of this.jobs.entries()) {
      if (job.isFinished() && now - job.completedAt > threshold) {
        this.jobs.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[JobQueue] Limpeza automática: ${cleaned} jobs removidos`);
    }
    
    return cleaned;
  }
  
  /**
   * Para a limpeza automática (útil para testes)
   */
  stopAutoCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
export const jobQueueService = new JobQueueService(10);
