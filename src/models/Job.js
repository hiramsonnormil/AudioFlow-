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
    
    // Video features
    this.videoStatus = null; // null, PENDING, PROCESSING, DONE, ERROR
    this.videoProgress = 0;
    this.videoOut = null;
    this.videoError = null;
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
   * Gera nome de arquivo formatado para download: nomedamusica-presetaplicado-diadoprocessamento.mp3
   */
  getFormattedDownloadFilename() {
    // Sanitiza o título da música
    let musicName = 'audio';
    if (this.metadata?.title) {
      musicName = this.metadata.title
        .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífen
        .toLowerCase()
        .substring(0, 50) // Limita tamanho
        .trim();
      
      if (!musicName || musicName === '') {
        musicName = 'audio';
      }
    }
    
    // Preset aplicado
    const preset = this.metadata?.preset || 'custom';
    const presetFormatted = preset.toLowerCase().replace(/\s+/g, '-');
    
    // Data do processamento (formato: YYYYMMDD)
    const processDate = this.completedAt 
      ? new Date(this.completedAt).toISOString().split('T')[0].replace(/-/g, '')
      : new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    return `${musicName}-${presetFormatted}-${processDate}.mp3`;
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
      downloadFilename: this.getFormattedDownloadFilename(), // Nome formatado para download
      filePath: this.out,
      thumbnail: this.metadata.thumbnail,
      videoId: this.metadata.videoId,
      preset: this.metadata.preset,
      error: this.error,
      createdAt: this.createdAt,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      
      // Video fields
      videoStatus: this.videoStatus,
      videoProgress: this.videoProgress,
      videoOut: this.videoOut,
      videoError: this.videoError
    };
  }
}
