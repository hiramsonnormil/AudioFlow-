/**
 * Route: Validate YouTube Video
 * Valida se um vídeo do YouTube existe e está disponível
 */

import express from 'express';
import { authRequired } from '../middleware/authRequired.js';
import { YouTubeService } from '../services/YouTubeService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const youtubeService = new YouTubeService(
  process.env.COOKIES_PATH || path.resolve(__dirname, '../../cookies.txt')
);

// Importar rate limiter (será adicionado no server.js)

/**
 * POST /validate-youtube
 * Valida se um vídeo do YouTube existe e está acessível
 * Rate limit: 10 validações por minuto por IP
 */
router.post('/', authRequired, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'missing_url',
      message: 'URL do YouTube é obrigatória'
    });
  }

  // Validar formato da URL
  if (!youtubeService.isYouTubeUrl(url)) {
    return res.status(400).json({
      error: 'invalid_url',
      message: 'URL inválida. Use um link do YouTube ou YouTube Music.'
    });
  }

  try {
    // Tentar obter metadados do vídeo
    const metadata = await youtubeService.getMetadata(url, 'validation');

    // Se não conseguiu obter título ou duração, o vídeo provavelmente não existe
    if (!metadata.title || metadata.title.includes('validation') || metadata.duration === 0) {
      return res.status(404).json({
        error: 'video_not_found',
        message: 'Vídeo não encontrado. Verifique se o link está correto e se o vídeo é público.'
      });
    }

    // Vídeo existe e está acessível
    return res.json({
      success: true,
      message: 'Vídeo válido',
      data: {
        title: metadata.title,
        duration: metadata.duration,
        thumbnail: metadata.thumbnail,
        videoId: metadata.videoId
      }
    });

  } catch (error) {
    console.error('[VALIDATE] Erro ao validar vídeo:', error);

    // Verificar tipo de erro
    if (error.message.includes('unavailable') || error.message.includes('private')) {
      return res.status(404).json({
        error: 'video_unavailable',
        message: 'Vídeo indisponível. Pode ser privado, ter sido removido ou ter restrições de região.'
      });
    }

    return res.status(500).json({
      error: 'validation_error',
      message: 'Erro ao validar vídeo. Tente novamente em alguns instantes.'
    });
  }
});

export default router;
