/**
 * Route: Download Proxy
 * Proxy para downloads do R2 quando CORS não está configurado
 */

import express from 'express';
import { authRequired } from '../middleware/authRequired.js';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

const router = express.Router();

// Cliente S3 para R2
function getR2Client() {
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID?.trim().replace(/^['\"]|['\"]$/g, '').replace(/\r?\n/g, '');
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY?.trim().replace(/^['\"]|['\"]$/g, '').replace(/\r?\n/g, '');
  const R2_ENDPOINT = process.env.R2_ENDPOINT?.trim().replace(/^['\"]|['\"]$/g, '').replace(/\r?\n/g, '');

  return new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * GET /api/download/:key
 * Faz proxy do download do R2 (para contornar problemas de CORS)
 */
router.get('/download/:key(*)', authRequired, async (req, res) => {
  try {
    const key = req.params.key;
    const userId = req.user.email || req.user._id;
    
    console.log(`[DOWNLOAD] Proxy request - User: ${userId}, Key: ${key}`);
    
    // Verificar se o arquivo pertence ao usuário
    if (!key.startsWith(`free/${userId}/`)) {
      console.warn(`[DOWNLOAD] Acesso negado - arquivo não pertence ao usuário`);
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Você não tem permissão para acessar este arquivo'
      });
    }
    
    // Buscar arquivo do R2
    const s3Client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    // Configurar headers de resposta
    const fileName = path.basename(key);
    res.set('Content-Type', response.ContentType || 'audio/mpeg');
    res.set('Content-Length', response.ContentLength);
    res.set('Content-Disposition', `attachment; filename="${fileName}"`);
    res.set('Cache-Control', 'public, max-age=3600');
    
    console.log(`[DOWNLOAD] Streaming arquivo: ${fileName} (${response.ContentLength} bytes)`);
    
    // Stream do arquivo para a resposta
    response.Body.pipe(res);
    
  } catch (error) {
    console.error('[DOWNLOAD] Erro:', error);
    
    if (error.name === 'NoSuchKey') {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Arquivo não encontrado ou já expirou'
      });
    }
    
    res.status(500).json({ 
      error: 'download_failed',
      message: error.message 
    });
  }
});

export default router;
