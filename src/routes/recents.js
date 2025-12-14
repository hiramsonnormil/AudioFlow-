/**
 * Route: Recent Processings
 * Endpoint protegido para listar processamentos recentes do usuário
 */

import express from 'express';
import { authRequired } from '../middleware/authRequired.js';
import { User } from '../models/User.js';
import * as r2 from '../../storage/r2.js';

const router = express.Router();

// Debug: verificar quais funções estão disponíveis no módulo r2
console.log('[RECENTS DEBUG] Funções disponíveis em r2:', Object.keys(r2));

/**
 * GET /api/recent-processings
 * Lista os processamentos recentes do usuário logado
 * Requer autenticação
 */
router.get('/recent-processings', authRequired, async (req, res) => {
  try {
    const userSource = req.user.email || req.user._id;
    
    if (!userSource || userSource === 'anonymous') {
      return res.status(401).json({ 
        error: 'unauthorized',
        message: 'Você precisa estar logado para ver seus processamentos'
      });
    }

    // Buscar plano atualizado do banco de dados
    let userPlan = 'free';
    if (req.user._id) {
      const userRecord = await User.findById(req.user._id).select('plan');
      if (userRecord?.plan) {
        userPlan = userRecord.plan;
      }
    }

    // Importar getUserIdentity para obter o storageKey correto
    const { getUserIdentity } = await import('../config/security.js');
    const { storageKey } = getUserIdentity(userSource);

    // Determinar tier baseado no plano atualizado
    const tier = (userPlan === 'voz_pro' || userPlan === 'voz_master' || userPlan === 'premium_30')
      ? 'premium'
      : 'free';

    console.log(`[RECENTS] User: ${userSource}, Plano: ${userPlan}, Tier: ${tier}, StorageKey: ${storageKey}`);

    // Buscar em ambas as pastas para garantir
    const freeObjects = await r2.listUserObjects(storageKey, 'free');
    const premiumObjects = await r2.listUserObjects(storageKey, 'premium');
    const objects = [...freeObjects, ...premiumObjects];
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

    console.log(`[RECENTS] ✅ ${processings.length} processamentos (${freeObjects.length} free + ${premiumObjects.length} premium) para ${userSource}`);

    return res.json({
      success: true,
      count: processings.length,
      user: userSource,
      userPlan: userPlan,
      tier: tier,
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
