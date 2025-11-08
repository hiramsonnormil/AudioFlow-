/**
 * Model: Job
 * Representa um trabalho de processamento de áudio
 */

export class Job {
  constructor(id) {
    this.id = id;
    this.status = "PENDING"; // PENDING, DOWNLOADING, EXTRACTING, PROCESSING, DONE, ERROR
    this.progress = 0; // 0-100
    this.in = null; // URL de entrada
    this.out = null; // Caminho do arquivo de saída
    this.error = null; // Mensagem de erro se houver
    this.metadata = {
      title: null,
      thumbnail: null,
      duration: 0,
      videoId: null,
      preset: null,
    };
    this.filename = null; // Nome do arquivo de saída
    this.createdAt = new Date();
    this.startedAt = null;
    this.completedAt = null;
  }

  /**
   * Inicia o processamento do job
   */
  start() {
    this.startedAt = new Date();
    this.status = "DOWNLOADING";
    this.progress = 0;
  }

  /**
   * Marca o job como concluído
   */
  complete() {
    this.status = "DONE";
    this.progress = 100;
    this.completedAt = new Date();
  }

  /**
   * Marca o job como erro
   */
  fail(errorMessage) {
    this.status = "ERROR";
    this.error = errorMessage;
    this.completedAt = new Date();
  }

  /**
   * Retorna o tempo de processamento em segundos
   */
  getProcessingTime() {
    if (!this.startedAt) return null;
    const end = this.completedAt || new Date();
    return Math.round((end - this.startedAt) / 1000);
  }

  /**
   * Verifica se o job está finalizado
   */
  isFinished() {
    return this.status === "DONE" || this.status === "ERROR";
  }

  /**
   * Converte o job para JSON para resposta da API
   */
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
