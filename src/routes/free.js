/**
 * Rotas para usuários FREE com integração R2
 */

import express from 'express';
import { FreeUserController } from '../controllers/FreeUserController.js';

const router = express.Router();
const controller = new FreeUserController();

// POST /api/free/process - Processa áudio e retorna URL do R2
router.post('/process', (req, res) => controller.processAudio(req, res));

// GET /api/free/recent - Lista processamentos recentes (última 1h)
router.get('/recent', (req, res) => controller.getRecentProcessing(req, res));

// POST /api/free/cleanup - Força limpeza de arquivos expirados
router.post('/cleanup', (req, res) => controller.cleanupExpired(req, res));

export default router;
