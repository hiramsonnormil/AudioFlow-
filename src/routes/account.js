import express from "express";
import { User } from "../models/User.js";
import { Subscription } from "../models/Subscription.js";
import { Payment } from "../models/Payment.js";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/security.js";

const router = express.Router();
const JWT_SECRET = getJwtSecret();

/**
 * POST /api/account/sync-plan
 * Sincroniza o plano do User com a assinatura ativa
 */
router.post("/sync-plan", async (req, res) => {
  try {
    const header = req.headers?.authorization || req.headers?.Authorization;
    const bearer = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies?.token || bearer;

    if (!token) {
      return res.status(401).json({ error: "no_token" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // Buscar assinatura ativa
    const subscription = await Subscription.findOne({
      userId: user._id,
      status: "active",
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: -1 });

    if (!subscription) {
      // Se não tem assinatura ativa, definir como free
      await User.findByIdAndUpdate(userId, { plan: "free" });
      return res.json({ 
        success: true, 
        message: "Plano atualizado para free (sem assinatura ativa)",
        plan: "free" 
      });
    }

    // Atualizar o plano do User
    await User.findByIdAndUpdate(userId, { plan: subscription.plan });

    return res.json({ 
      success: true, 
      message: "Plano sincronizado com sucesso",
      oldPlan: user.plan,
      newPlan: subscription.plan
    });
  } catch (error) {
    console.error("[SYNC PLAN] Error:", error);
    return res.status(500).json({ error: "server_error", message: error.message });
  }
});

/**
 * GET /api/account/status
 * Retorna informações completas da conta: usuário, assinatura ativa e histórico de pagamentos
 */
router.get("/status", async (req, res) => {
  try {
    // Autenticar usuário
    const header = req.headers?.authorization || req.headers?.Authorization;
    const bearer = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
    const token = req.cookies?.token || bearer;

    if (!token) {
      return res.status(401).json({ error: "no_token" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload._id;

    // Buscar usuário
    const user = await User.findById(userId).select("_id username email plan createdAt");
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    // Buscar assinatura ativa (que ainda não expirou)
    const subscription = await Subscription.findOne({
      userId: user._id,
      status: "active",
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: -1 });

    console.log(`[ACCOUNT] Assinatura ativa encontrada:`, subscription ? `Sim, Plano: ${subscription.plan}, Expira: ${subscription.expiresAt}` : 'Não');

    // Determinar o plano real do usuário
    // Se tem assinatura ativa e não expirada, usar o plano da assinatura
    // Senão, usar o plano do modelo User (geralmente 'free')
    const actualPlan = subscription?.plan || user.plan;

    // Sincronizar o plano do User se necessário (AUTO-SYNC)
    if (subscription && user.plan !== subscription.plan) {
      await User.findByIdAndUpdate(user._id, { plan: subscription.plan });
    } else if (!subscription && user.plan !== "free") {
      // Se não tem assinatura ativa mas o user não está como free, corrigir
      await User.findByIdAndUpdate(user._id, { plan: "free" });
    }

    // Buscar pagamento pendente (se não tiver assinatura ativa)
    let pendingPayment = null;
    if (!subscription) {
      pendingPayment = await Payment.findOne({
        userId: user._id,
        status: "pending",
      }).sort({ createdAt: -1 });
    }

    // Buscar histórico de pagamentos (últimos 10)
    const paymentHistory = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("value status createdAt plan metadata");

    // Montar resposta
    const response = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        plan: actualPlan, // Usar o plano real (subscription.plan ou user.plan)
        memberSince: user.createdAt,
      },
      subscription: subscription
        ? {
            id: subscription._id,
            plan: subscription.plan,
            status: subscription.status,
            value: subscription.value,
            startedAt: subscription.startedAt,
            expiresAt: subscription.expiresAt,
            nextBillingDate: subscription.expiresAt,
            daysRemaining: Math.ceil((subscription.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
          }
        : null,
      pendingPayment: pendingPayment
        ? {
            id: pendingPayment._id,
            value: pendingPayment.value,
            plan: pendingPayment.plan,
            status: pendingPayment.status,
            createdAt: pendingPayment.createdAt,
            pixCode: pendingPayment.metadata?.pixCode,
            expiresAt: pendingPayment.metadata?.expiresAt,
          }
        : null,
      paymentHistory: paymentHistory.map((payment) => ({
        id: payment._id,
        value: payment.value,
        plan: payment.plan,
        status: payment.status,
        date: payment.createdAt,
      })),
    };

    return res.json(response);
  } catch (error) {
    console.error("[ACCOUNT STATUS] Error:", error);
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "invalid_token" });
    }
    return res.status(500).json({ error: "server_error", message: error.message });
  }
});

export default router;
