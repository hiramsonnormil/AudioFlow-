/**
 * Routes: Process Routes
 * Define as rotas para processamento de áudio
 */

import express from "express";


export function createProcessRoutes(controller) {
  const router = express.Router();

  // POST /process - Iniciar novo processamento (REQUER AUTENTICAÇÃO)
  router.post("/process", (req, res) => controller.startProcess(req, res));

  // Status de um job
  router.get("/status/:id", (req, res) => controller.getStatus(req, res));

  // GET /queue-stats - Obter estatísticas da fila
  router.get("/queue-stats", (req, res) => controller.getQueueStats(req, res));

  // GET /file/:id - Fazer download do arquivo
  router.get("/file/:id", (req, res) => controller.downloadFile(req, res));

  // POST /api/process/:id/video - Iniciar geração de vídeo
  router.post("/api/process/:id/video", (req, res) => controller.startVideoGeneration(req, res));

  // GET /file/:id/video - Fazer download do vídeo gerado
  router.get("/file/:id/video", (req, res) => controller.downloadVideo(req, res));

  // GET /presets - Listar presets disponíveis (público)
  router.get("/presets", (req, res) => controller.getPresets(req, res));

  return router;
}
