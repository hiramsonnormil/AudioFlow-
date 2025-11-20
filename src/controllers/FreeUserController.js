/**
 * Controller para processamento de áudio de usuários FREE com R2
 * 
 * Este controller substitui o fluxo antigo de salvar arquivos localmente
 * e implementa o novo fluxo com R2:
 * 1. Processamento temporário com FFmpeg
 * 2. Upload automático para R2
 * 3. Deleção do arquivo local
 * 4. Retorno da URL pública
 */

import { AudioProcessingService } from '../services/AudioProcessingService.js';
import { YouTubeService } from '../services/YouTubeService.js';
import * as r2 from '../../storage/r2.js';

export class FreeUserController {
  constructor() {
    this.audioService = new AudioProcessingService();
    this.youtubeService = new YouTubeService();
  }

  /**
   * POST /api/free/process
   * 
   * Processa áudio para usuário free e retorna URL do R2
   */
  async processAudio(req, res) {
    try {
      const { url, preset } = req.body;
      const userId = req.user?.id || 'anonymous'; // Pega do token JWT ou usa anonymous
      const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Validações
      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL do vídeo é obrigatória'
        });
      }

      if (!preset) {
        return res.status(400).json({
          success: false,
          error: 'Preset é obrigatório'
        });
      }

      console.log(`[${jobId}] Iniciando processamento free - User: ${userId}, Preset: ${preset}`);

      // 1. Busca metadados do vídeo
      const metadata = await this.youtubeService.getMetadata(url);
      const duration = typeof metadata.duration === 'number' 
        ? metadata.duration 
        : parseFloat(metadata.duration) || 0;

      // 2. Obtém stream de áudio
      const audioStream = this.youtubeService.getAudioStream(url, jobId);

      // 3. Processa e faz upload para R2
      const result = await this.audioService.processAndUploadToR2(
        audioStream,
        jobId,
        userId,
        preset,
        duration,
        metadata.title
      );

      console.log(`[${jobId}] Processamento concluído com sucesso`);

      // 4. Retorna URL pública do R2
      res.json({
        success: true,
        jobId,
        downloadUrl: result.publicUrl,
        metadata: {
          title: metadata.title,
          preset,
          duration,
          expiresIn: '1 hora'
        }
      });

    } catch (error) {
      console.error('[FreeUserController] Erro no processamento:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao processar áudio'
      });
    }
  }

  /**
   * GET /api/free/recent
   * 
   * Lista processamentos recentes do usuário (última 1 hora)
   */
  async getRecentProcessing(req, res) {
    try {
      const userId = req.user?.id || req.query.userId || 'anonymous';

      console.log(`[FreeUserController] Listando processamentos recentes - User: ${userId}`);

      // Busca objetos válidos no R2 (menos de 1h)
      const objects = await r2.listFreeUserObjects(userId);

      // Formata resposta
      const processamentos = objects.map(obj => ({
        jobId: obj.jobId,
        fileName: obj.fileName,
        createdAt: obj.createdAt,
        expiresInMinutes: Math.ceil(obj.expiresIn / 1000 / 60),
        size: obj.size,
        downloadUrl: obj.publicUrl,
      }));

      res.json({
        success: true,
        userId,
        total: processamentos.length,
        processamentos,
        message: processamentos.length === 0 
          ? 'Nenhum processamento recente encontrado' 
          : `${processamentos.length} processamento(s) disponível(is) para download`
      });

    } catch (error) {
      console.error('[FreeUserController] Erro ao listar processamentos:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao listar processamentos'
      });
    }
  }

  /**
   * POST /api/free/cleanup
   * 
   * Força limpeza de arquivos expirados do usuário
   */
  async cleanupExpired(req, res) {
    try {
      const userId = req.user?.id || req.body.userId || 'anonymous';

      console.log(`[FreeUserController] Limpando objetos expirados - User: ${userId}`);

      const result = await r2.cleanupExpiredFreeObjects(userId);

      res.json({
        success: true,
        userId,
        deleted: result.deleted,
        errors: result.errors,
        message: `Limpeza concluída: ${result.deleted} arquivo(s) deletado(s)`
      });

    } catch (error) {
      console.error('[FreeUserController] Erro na limpeza:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Erro ao limpar arquivos expirados'
      });
    }
  }
}
