/**
 * Route: Recent Processings
 * Endpoint protegido para listar processamentos recentes do usuário
 */

import express from 'express';
import fs from 'fs';
import * as r2 from '../../storage/r2.js';
import { jobQueueService } from '../services/JobQueueService.js';

const router = express.Router();

// Debug: verificar quais funções estão disponíveis no módulo r2
console.log('[RECENTS DEBUG] Funções disponíveis em r2:', Object.keys(r2));

/**
 * GET /api/recent-processings
 * Lista os processamentos recentes do usuário logado
 * Requer autenticação
 */
router.get('/recent-processings', async (req, res) => {
  try {
    const userSource = req.ip;

    // Importar getUserIdentity para obter o storageKey correto
    const { getUserIdentity } = await import('../config/security.js');
    const { storageKey } = getUserIdentity(userSource);

    let freeObjects = [];
    let premiumObjects = [];
    let isLocalFallback = false;
    
    try {
      // Buscar em ambas as pastas para garantir
      freeObjects = await r2.listUserObjects(storageKey, 'free');
      premiumObjects = await r2.listUserObjects(storageKey, 'premium');
    } catch (err) {
      console.warn(`[RECENTS] Fallback local - R2 desabilitado: ${err.message}`);
      isLocalFallback = true;
    }
    
    let objects = [];
    
    if (isLocalFallback) {
      // Retorna os jobs locais da memória
      const now = Date.now();
      const ONE_HOUR = 60 * 60 * 1000;
      
      for (const [id, job] of jobQueueService.jobs.entries()) {
        if (job.status === "DONE" && job.out && fs.existsSync(job.out)) {
          const objectAge = now - job.completedAt;
          if (objectAge <= ONE_HOUR) {
            let size = 0;
            try { size = fs.statSync(job.out).size; } catch(e){}
            
            objects.push({
              key: job.id,
              fileName: `${job.id}.mp3`,
              jobId: job.id,
              size: size,
              createdAt: new Date(job.completedAt).toISOString(),
              expiresIn: ONE_HOUR - objectAge,
              preset: job.metadata?.preset || 'CUSTOM',
              title: job.metadata?.title || 'Áudio Local',
              tier: 'local'
            });
          }
        }
      }
      
      // Ordena do mais recente para o mais antigo
      objects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      objects = [...freeObjects, ...premiumObjects];
    }
    // Retorna os objetos com informações adicionais
    const processings = objects.map(obj => {
      const processing = {
        key: obj.key,
        fileName: obj.fileName,
        jobId: obj.jobId,
        size: obj.size,
        createdAt: obj.createdAt,
        expiresIn: obj.expiresIn,
        publicUrl: obj.publicUrl,
        userId: userSource, // Email visível para o usuário
        preset: obj.preset || 'CUSTOM',
        title: obj.title || null, // Título do áudio se disponível nos metadados
        tier: obj.tier,
      };
      console.log(`[RECENTS] 📦 Objeto: ${obj.jobId}, expiresIn: ${obj.expiresIn}, tier: ${obj.tier}`);
      return processing;
    });

    console.log(`[RECENTS] ✅ ${processings.length} processamentos para ${userSource}`);

    return res.json({
      success: true,
      count: processings.length,
      user: userSource,
      processings
    });

  } catch (error) {
    console.error('[RECENT] Erro ao buscar processamentos:', error);
    return res.status(500).json({
      error: 'fetch_failed',
      message: error.message
    });
  }
});


export default router;
