/**
 * Módulo de integração com Cloudflare R2 (compatível com S3)
 * 
 * Este módulo gerencia:
 * - Upload de arquivos processados para o R2
 * - Geração de URLs públicas
 * - Limpeza automática de arquivos expirados (retenção de 24h)
 * - Deleção de arquivos locais temporários após upload
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

// Prefixo único dos arquivos processados no bucket: audio/<userId>/<jobId>.mp3
export const STORAGE_PREFIX = 'audio';
// Tempo de retenção dos arquivos processados no R2
export const RETENTION_MS = 24 * 60 * 60 * 1000;

// Normaliza valores vindos do .env (remove aspas e spaces acidentais)
const _norm = (v) => {
  if (!v && v !== "") return undefined;
  // trim ends, remove surrounding quotes and strip internal newlines
  return String(v)
    .replace(/^\s+|\s+$/g, "")
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\r?\n/g, "")
    .trim();
};

// Lazy initialization: cria o cliente S3 apenas quando necessário
let _s3 = null;
let _BUCKET = null;
let _R2_ENDPOINT = null;

function ensureClient() {
  if (_s3) return _s3;

  const R2_ACCESS_KEY_ID = _norm(process.env.R2_ACCESS_KEY_ID);
  const R2_SECRET_ACCESS_KEY = _norm(process.env.R2_SECRET_ACCESS_KEY);
  const R2_ENDPOINT = _norm(process.env.R2_ENDPOINT);
  const BUCKET_NAME = _norm(process.env.R2_BUCKET_NAME);

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'Cloudflare R2 credentials not found: set R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY in your .env (single-line, no surrounding quotes).'
    );
  }
  if (!R2_ENDPOINT) {
    throw new Error('Cloudflare R2 endpoint not found: set R2_ENDPOINT in your .env');
  }
  if (!BUCKET_NAME) {
    throw new Error('Cloudflare R2 bucket name not found: set R2_BUCKET_NAME in your .env');
  }

  _s3 = new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  _BUCKET = BUCKET_NAME;
  _R2_ENDPOINT = R2_ENDPOINT;

  return _s3;
}

// Extrai o Account ID do endpoint para montar URLs públicas
// Formato esperado: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
const getAccountIdFromEndpoint = () => {
  const endpoint = process.env.R2_ENDPOINT;
  const match = endpoint.match(/https:\/\/(.+?)\.r2\.cloudflarestorage\.com/);
  return match ? match[1] : null;
};

/**
 * Faz upload de um arquivo local para o R2
 * 
 * @param {string} localPath - Caminho completo do arquivo local
 * @param {string} key - Chave/caminho do objeto no R2 (ex: audio/user123/job456.mp3)
 * @param {object} options - Opções adicionais (userId, preset, etc)
 * @returns {Promise<{key: string, publicUrl: string}>}
 */
async function uploadFile(localPath, key, options = {}) {
  try {
    // Prepara metadados para armazenar junto ao objeto
    const metadata = {
      'user-id': options.userId || 'unknown',
      'created-at': new Date().toISOString(),
      'preset': options.preset || 'default',
      'job-id': options.jobId || '',
      'title': options.title || '',
    };
    
    // Detecta o Content-Type baseado na extensão
    const ext = path.extname(localPath).toLowerCase();
    const contentTypeMap = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg',
      '.flac': 'audio/flac',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    // Assegura cliente e bucket
    ensureClient();
    
    // Usa stream em vez de carregar arquivo completo na memória
    const fileStream = await fs.readFile(localPath);

    // Comando de upload para o R2
    const command = new PutObjectCommand({
      Bucket: _BUCKET,
      Key: key,
      Body: fileStream,
      ContentType: contentType,
      Metadata: metadata,
    });
    
    await _s3.send(command);
    
    const publicUrl = getPublicUrl(key);
    
    return { key, publicUrl };
  } catch (error) {
    throw new Error(`Falha no upload para R2: ${error.message}`);
  }
}

/**
 * Monta a URL pública de um objeto no R2
 * 
 * @param {string} key - Chave do objeto no bucket
 * @returns {string} URL pública completa
 */
function getPublicUrl(key) {
  // garante que o endpoint/bucket foram inicializados
  if (!_s3) ensureClient();
  const accountId = getAccountIdFromEndpoint();
  if (!accountId) {
    throw new Error('Não foi possível extrair Account ID do endpoint R2');
  }
  return `https://${accountId}.r2.cloudflarestorage.com/${_BUCKET}/${key}`;
}

/**
 * Deleta um objeto do R2
 * 
 * @param {string} key - Chave do objeto a ser deletado
 * @returns {Promise<void>}
 */
async function deleteObject(key) {
  try {
    ensureClient();
    const command = new DeleteObjectCommand({
      Bucket: _BUCKET,
      Key: key,
    });
    
    await _s3.send(command);
  } catch (error) {
    console.error(`[R2] Erro ao deletar objeto ${key}:`, error);
    throw new Error(`Falha ao deletar do R2: ${error.message}`);
  }
}

/**
 * Lista e limpa objetos expirados de um usuário (mais antigos que RETENTION_MS)
 * 
 * @param {string} userId - ID do usuário (storageKey)
 * @returns {Promise<{deleted: number, errors: number}>}
 */
async function cleanupExpiredObjects(userId) {
  try {
    // Lista objetos do usuário usando prefixo
    ensureClient();
    const prefix = `${STORAGE_PREFIX}/${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: _BUCKET,
      Prefix: prefix,
    });
    
    const response = await _s3.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return { deleted: 0, errors: 0 };
    }
    
    const now = Date.now();
    
    let deleted = 0;
    let errors = 0;
    
    // Para cada objeto, verifica se passou do tempo de retenção
    for (const obj of response.Contents) {
      try {
        // A data de modificação do objeto é usada como referência
        const objectAge = now - new Date(obj.LastModified).getTime();
        
        if (objectAge > RETENTION_MS) {
          await deleteObject(obj.Key);
          deleted++;
        }
      } catch (error) {
        console.error(`[R2] Erro ao processar objeto ${obj.Key}:`, error);
        errors++;
      }
    }
    
    return { deleted, errors };
  } catch (error) {
    console.error('[R2] Erro na limpeza de objetos expirados:', error);
    throw new Error(`Falha na limpeza: ${error.message}`);
  }
}

/**
 * Deleta um arquivo local após upload bem-sucedido
 * 
 * @param {string} localPath - Caminho do arquivo a ser deletado
 * @returns {Promise<void>}
 */
async function deleteLocalFile(localPath) {
  try {
    await fs.unlink(localPath);
  } catch (error) {
    // Não lança erro, apenas loga - a falha em deletar local não deve quebrar o fluxo
    console.warn(`[R2] Falha ao deletar arquivo local ${localPath}:`, error.message);
  }
}

/**
 * Baixa um arquivo do R2 usando autenticação S3
 * Retorna um stream que pode ser usado diretamente com res.pipe()
 * 
 * @param {string} key - Chave do objeto no R2 (ex: audio/user@email.com/job123.mp3)
 * @returns {Promise<Readable>} Stream do arquivo
 */
async function downloadFile(key) {
  try {
    const s3 = ensureClient();
    const bucket = _BUCKET;
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    const response = await s3.send(command);
    
    // response.Body é um stream ReadableStream (Web API)
    // Precisa converter para Node.js Readable stream
    if (response.Body) {
      return response.Body;
    }
    
    throw new Error('No body in R2 response');
  } catch (error) {
    console.error(`[R2] Erro ao baixar arquivo ${key}:`, error);
    throw error;
  }
}

/**
 * Extrai a key do R2 a partir de uma URL pública
 * Ex: https://account.r2.cloudflarestorage.com/phona/audio/user@email.com/file.mp3
 * Retorna: audio/user@email.com/file.mp3
 */
function extractKeyFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Remove o bucket name do início do path
    // Formato: /bucket-name/key -> key
    const parts = pathname.split('/').filter(p => p);
    
    if (parts.length > 1 && parts[0] === _BUCKET) {
      return parts.slice(1).join('/');
    }
    
    // Se não encontrar o bucket, assume que todo o path é a key
    return parts.join('/');
  } catch (error) {
    console.error('[R2] Erro ao extrair key da URL:', error);
    return null;
  }
}

/**
 * Lista objetos válidos (não expirados) de um usuário
 * Objetos mais antigos que RETENTION_MS são removidos silenciosamente
 * @param {string} userId - Hash do usuário (storageKey)
 * @returns {Promise<Array>} Lista de objetos válidos com metadata
 */
export async function listUserObjects(userId) {
  try {
    ensureClient();
    const prefix = `${STORAGE_PREFIX}/${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: _BUCKET,
      Prefix: prefix,
    });
    
    const response = await _s3.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      console.log(`[R2] Nenhum objeto encontrado em ${prefix}`);
      return [];
    }
    
    const now = Date.now();
    const validObjects = [];
    
    for (const obj of response.Contents) {
      const objectAge = now - new Date(obj.LastModified).getTime();
      
      if (objectAge <= RETENTION_MS) {
        const fileName = path.basename(obj.Key);
        const jobId = fileName.replace(path.extname(fileName), '');
        
        // Busca metadata do objeto
        let metadata = {};
        try {
          const headCommand = new HeadObjectCommand({
            Bucket: _BUCKET,
            Key: obj.Key,
          });
          const headResponse = await _s3.send(headCommand);
          metadata = headResponse.Metadata || {};
        } catch (error) {
          console.warn(`[R2] Não foi possível obter metadata de ${obj.Key}:`, error.message);
        }
        
        validObjects.push({
          key: obj.Key,
          fileName: fileName,
          jobId: jobId,
          size: obj.Size,
          createdAt: obj.LastModified,
          expiresIn: Math.max(0, RETENTION_MS - objectAge),
          publicUrl: getPublicUrl(obj.Key),
          preset: metadata['preset'] || 'CUSTOM',
          userId: metadata['user-id'] || userId,
          title: metadata['title'] || null,
        });
      } else {
        // Objeto expirado - deleta silenciosamente
        try {
          await deleteObject(obj.Key);
          console.log(`[R2] Objeto expirado deletado: ${obj.Key}`);
        } catch (delError) {
          console.warn(`[R2] Falha ao deletar objeto expirado ${obj.Key}:`, delError.message);
        }
      }
    }
    
    console.log(`[R2] ✅ ${validObjects.length} objetos válidos em ${prefix}`);
    return validObjects;
  } catch (error) {
    console.error(`[R2] Erro ao listar objetos de ${userId}:`, error);
    throw error;
  }
}

export {
  uploadFile,
  getPublicUrl,
  deleteObject,
  cleanupExpiredObjects,
  deleteLocalFile,
  downloadFile,
  extractKeyFromUrl,
};
