/**
 * Routes: Process Routes
 * Define as rotas para processamento de áudio
 */

import express from "express";
import { authRequired } from "../middleware/authRequired.js";

export function createProcessRoutes(controller) {
  const router = express.Router();

  // POST /process - Iniciar novo processamento (REQUER AUTENTICAÇÃO)
  router.post("/process", authRequired, (req, res) => controller.startProcess(req, res));

  // GET /status/:id - Obter status do job (REQUER AUTENTICAÇÃO)
  router.get("/status/:id", authRequired, (req, res) => controller.getStatus(req, res));

  // GET /queue-stats - Obter estatísticas da fila
  router.get("/queue-stats", (req, res) => controller.getQueueStats(req, res));

  // GET /file/:id - Fazer download do arquivo (REQUER AUTENTICAÇÃO)
  router.get("/file/:id", authRequired, (req, res) => controller.downloadFile(req, res));

  // GET /presets - Listar presets disponíveis (público)
  router.get("/presets", (req, res) => controller.getPresets(req, res));

  return router;
}
