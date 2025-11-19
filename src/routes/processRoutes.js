/**
 * Routes: Process Routes
 * Define as rotas para processamento de áudio
 */

import express from "express";

export function createProcessRoutes(controller) {
  const router = express.Router();

  // POST /process - Iniciar novo processamento
  router.post("/process", (req, res) => controller.startProcess(req, res));

  // GET /status/:id - Obter status do job
  router.get("/status/:id", (req, res) => controller.getStatus(req, res));

  // GET /queue-stats - Obter estatísticas da fila
  router.get("/queue-stats", (req, res) => controller.getQueueStats(req, res));

  // GET /file/:id - Fazer download do arquivo
  router.get("/file/:id", (req, res) => controller.downloadFile(req, res));

  // GET /presets - Listar presets disponíveis
  router.get("/presets", (req, res) => controller.getPresets(req, res));

  return router;
}
