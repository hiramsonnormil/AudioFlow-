import { Router } from "express";
import rateLimit from "express-rate-limit";
import { pixController } from "../controllers/PixController.js";
import { authRequired } from "../middleware/authRequired.js";

const router = Router();

/**
 * Rate limiter para criação de PIX
 * Máximo 5 cobranças por hora por IP
 */
const createPixLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    success: false,
    error: "Muitas tentativas de criação de cobrança. Tente novamente em 1 hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para consulta manual (botão "Já paguei")
 * Máximo 30 consultas por minuto por IP (permite polling automático a cada 3s)
 */
const checkStatusLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 requisições por minuto = 1 a cada 2 segundos
  message: {
    success: false,
    error: "Muitas tentativas de verificação. Aguarde um momento.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Contar todas as requisições
});

// ===== ROTAS PROTEGIDAS =====

/**
 * POST /api/pix/create
 * Criar cobrança PIX
 * Requer autenticação
 */
router.post("/create", authRequired, createPixLimiter, (req, res) =>
  pixController.createCharge(req, res)
);

/**
 * GET /api/pix/check/:transactionId
 * Consultar status PIX (automático via polling ou manual)
 * Requer autenticação
 * Rate limit: 20 req/min (permite polling a cada 3s)
 */
router.get("/check/:transactionId", authRequired, checkStatusLimiter, (req, res) =>
  pixController.checkStatus(req, res)
);

/**
 * GET /api/pix/payments
 * Listar pagamentos do usuário
 * Requer autenticação
 */
router.get("/payments", authRequired, (req, res) => pixController.listPayments(req, res));

// ===== ROTA PÚBLICA (WEBHOOK) =====

/**
 * POST /api/webhooks/pushinpay
 * Webhook PushinPay
 * NÃO requer autenticação de usuário
 * Validação por assinatura no header
 */
router.post("/pushinpay", (req, res) => pixController.handleWebhook(req, res));

export default router;
