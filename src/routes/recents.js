/**
 * Route: Recent Processings
 * Endpoint protegido para listar processamentos recentes do usuário
 */

import express from 'express';
import { authRequired } from '../middleware/authRequired.js';
import * as r2 from '../../storage/r2.js';

const router = express.Router();

/**
 * GET /api/recent-processings
 * Lista os processamentos recentes do usuário logado
 * Requer autenticação
 */
router.get('/recent-processings', authRequired, async (req, res) => {
  try {
    const userId = req.user.email || req.user._id;
    
    if (!userId || userId === 'anonymous') {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Você precisa estar logado para ver seus processamentos'
      });
    }

    console.log(`[RECENT] Buscando processamentos para usuário: ${userId}`);

    // Lista objetos do R2 para este usuário
    const objects = await r2.listFreeUserObjects(userId);

    console.log(`[RECENT] Encontrados ${objects.length} processamentos para ${userId}`);

    // Retorna os objetos com informações adicionais
    const processings = objects.map(obj => {
      // Tenta extrair informações do metadata (futuramente podemos buscar do DB)
      return {
        key: obj.key,
        fileName: obj.fileName,
        jobId: obj.jobId,
        size: obj.size,
        createdAt: obj.createdAt,
        expiresIn: obj.expiresIn,
        publicUrl: obj.publicUrl,
        userId: userId,
        // Tenta extrair preset do nome do arquivo ou usa padrão
        preset: extractPresetFromKey(obj.key) || 'CUSTOM'
      };
    });

    return res.json({
      success: true,
      count: processings.length,
      user: userId,
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

/**
 * Helper: Extrai o preset do caminho do arquivo no R2
 * Exemplo: free/user@email.com/jobId.mp3 -> tenta identificar preset do metadata
 */
function extractPresetFromKey(key) {
  // Por enquanto retorna null - o metadata do S3 tem essa info
  // Podemos melhorar isso buscando do metadata do objeto
  return null;
}

export default router;
