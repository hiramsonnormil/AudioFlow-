/**
 * Route: Download Proxy
 * Proxy para downloads do R2 quando CORS não está configurado
 */

import express from 'express';
import { authRequired } from '../middleware/authRequired.js';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
    const key = decodeURIComponent(req.params.key);
    const userId = req.user.email || req.user._id;
    
    // Verificar se o arquivo pertence ao usuário
    const expectedPrefix = `free/${userId}/`;
    if (!key.startsWith(expectedPrefix)) {
      return res.status(403).json({ 
        error: 'forbidden',
        message: 'Você não tem permissão para acessar este arquivo'
      });
    }
    
    // Buscar arquivo do R2
    const s3Client = getR2Client();
    
    // Primeiro verificar se o arquivo existe e obter metadados
    const bucketName = process.env.R2_BUCKET_NAME?.trim().replace(/^['\"]|['\"]$/g, '').replace(/\r?\n/g, '');
    
    if (!bucketName) {
      console.error('[DOWNLOAD] R2_BUCKET_NAME não configurado');
      return res.status(500).json({ 
        error: 'configuration_error',
        message: 'Configuração do servidor inválida'
      });
    }
    
    let headResponse;
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: key,
      });
      headResponse = await s3Client.send(headCommand);
    } catch (headError) {
      if (headError.name === 'NoSuchKey' || headError.name === 'NotFound') {
        console.error(`[DOWNLOAD] Arquivo não encontrado no R2: ${key}`);
        return res.status(404).json({ 
          error: 'not_found',
          message: 'Arquivo não encontrado ou já expirou'
        });
      }
      throw headError;
    }
    
    // Verificar se arquivo expirou (mais de 1 hora)
    const lastModified = headResponse.LastModified;
    if (lastModified) {
      const now = new Date();
      const fileAge = now - new Date(lastModified).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      
      if (fileAge > ONE_HOUR) {
        return res.status(410).json({ 
          error: 'expired',
          message: 'Arquivo expirado (mais de 1 hora)'
        });
      }
    }
    
    const metadata = headResponse.Metadata || {};
    
    // Gerar nome formatado: nomedamusica-presetaplicado-diadoprocessamento.mp3
    const title = metadata['title'] || 'audio';
    const preset = metadata['preset'] || 'custom';
    const createdAt = metadata['created-at'] || headResponse.LastModified?.toISOString() || new Date().toISOString();
    
    // Sanitiza o título
    let musicName = title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50)
      .trim() || 'audio';
    
    // Preset formatado
    const presetFormatted = preset.toLowerCase().replace(/\s+/g, '-');
    
    // Data formatada (YYYYMMDD)
    const processDate = new Date(createdAt).toISOString().split('T')[0].replace(/-/g, '');
    
    const formattedFileName = `${musicName}-${presetFormatted}-${processDate}.mp3`;
    
    // Agora buscar o arquivo para stream
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const response = await s3Client.send(getCommand);
    
    if (!response.Body) {
      throw new Error('Arquivo vazio ou corrompido');
    }
    
    // Configurar headers de resposta com nome formatado
    res.set('Content-Type', response.ContentType || 'audio/mpeg');
    if (response.ContentLength) {
      res.set('Content-Length', response.ContentLength);
    }
    res.set('Content-Disposition', `attachment; filename="${formattedFileName}"`);
    res.set('Cache-Control', 'public, max-age=3600');
    
    // Stream do arquivo para a resposta
    response.Body.pipe(res);
    
    response.Body.on('error', (err) => {
      console.error('[DOWNLOAD] Erro no stream:', err);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'stream_error',
          message: 'Erro ao transmitir arquivo'
        });
      }
    });
    
  } catch (error) {
    console.error('[DOWNLOAD] Erro:', error);
    
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      return res.status(404).json({ 
        error: 'not_found',
        message: 'Arquivo não encontrado ou já expirou'
      });
    }
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'download_failed',
        message: error.message || 'Erro ao fazer download do arquivo'
      });
    }
  }
});

export default router;
