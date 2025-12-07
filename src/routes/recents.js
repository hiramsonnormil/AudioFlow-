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

    // Lista objetos do R2 para este usuário
    const objects = await r2.listFreeUserObjects(userId);
    // Retorna os objetos com informações adicionais
    const processings = objects.map(obj => {
      return {
        key: obj.key,
        fileName: obj.fileName,
        jobId: obj.jobId,
        size: obj.size,
        createdAt: obj.createdAt,
        expiresIn: obj.expiresIn,
        publicUrl: obj.publicUrl,
        userId: userId,
        preset: obj.preset || 'CUSTOM',
        title: obj.title || null, // Título do áudio se disponível nos metadados
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


export default router;
