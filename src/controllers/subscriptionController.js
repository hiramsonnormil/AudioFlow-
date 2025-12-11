import mongoose from "mongoose";
import crypto from "crypto";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { createPixCharge } from "../services/pushinpayService.js";
import { addMonths } from "../utils/date.js";
import { buildPushinpayWebhookUrl } from "../utils/webhook.js";

const DEFAULT_PRO_AMOUNT = Number.parseInt(
  process.env.SUBSCRIPTION_VOZ_PRO_PRICE_CENTS || "1490",
  10
);

const DEFAULT_MASTER_AMOUNT = Number.parseInt(
  process.env.SUBSCRIPTION_VOZ_MASTER_PRICE_CENTS || "2990",
  10
);

const DEFAULT_PLUS_MASTER_AMOUNT = Number.parseInt(
  process.env.SUBSCRIPTION_VOZ_PLUS_MASTER_PRICE_CENTS || "5990",
  10
);

function getPlanConfig(planType = "premium_30") {
  const plans = {
    voz_pro: {
      amount: DEFAULT_PRO_AMOUNT,
      currency: "BRL",
      description: "Assinatura mensal Voz Pro",
    },
    voz_master: {
      amount: DEFAULT_MASTER_AMOUNT,
      currency: "BRL",
      description: "Assinatura mensal Voz Master",
    },
    voz_plus_master: {
      amount: DEFAULT_PLUS_MASTER_AMOUNT,
      currency: "BRL",
      description: "Assinatura mensal Plus Master",
    },
  };
  return plans[planType] || null;
}

function sanitizeObjectId(value) {
  if (!value) {
    return null;
  }
  if (mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
}

export async function startSubscription(req, res) {
  try {
    const { planType = "voz_pro", userId: bodyUserId, email: bodyEmail } = req.body;
    const plan = getPlanConfig(planType);
    if (!plan) {
      return res.status(400).json({ error: "invalid_plan" });
    }

    // Enforce authenticated user; ignore arbitrary identifiers from body
    const authUser = req.user;
    if (!authUser?._id || !authUser?.email) {
      return res.status(401).json({ error: "unauthorized" });
    }

    // If client sent identifiers, they must match the authenticated user
    if ((bodyUserId && String(bodyUserId) !== String(authUser._id)) ||
        (bodyEmail && String(bodyEmail).toLowerCase() !== String(authUser.email).toLowerCase())) {
      return res.status(403).json({ error: "forbidden" });
    }

    let user = await User.findById(sanitizeObjectId(authUser._id));
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const webhookUrl = buildPushinpayWebhookUrl();

    let subscription = await Subscription.findOne({ userId: user._id });

    // Hierarquia de planos para validação de upgrade/downgrade
    const planHierarchy = { voz_pro: 1, voz_master: 2, voz_plus_master: 3 };
    const currentPlanLevel = subscription ? planHierarchy[subscription.planType] || 0 : 0;
    const requestedPlanLevel = planHierarchy[planType] || 0;

    // ⚠️ VALIDAÇÃO CRÍTICA: Verificar plano ANTES de gerar PIX
    if (subscription) {
      const now = new Date();
      const isActive = subscription.status === 'active' && 
                      subscription.nextBillingDate && 
                      new Date(subscription.nextBillingDate) > now;
      
      // Se tem plano ativo (independente do status no DB, verificar pela data)
      if (isActive) {
        console.log(`🔍 Validação: Cliente tem ${subscription.planType} ativo até ${subscription.nextBillingDate}`);
        
        // Bloquear tentativa de gerar código para o MESMO PLANO que já está ativo
        if (planType === subscription.planType) {
          console.log(`🚫 Bloqueado: Cliente já possui ${planType} ativo`);
          return res.status(400).json({ 
            error: "plan_already_active",
            message: "Você já possui este plano ativo",
            currentPlan: subscription.planType,
            nextBillingDate: subscription.nextBillingDate
          });
        }

        // Bloquear DOWNGRADE (Master tentando gerar código Pro)
        if (requestedPlanLevel < currentPlanLevel) {
          console.log(`🚫 Bloqueado: Downgrade ${subscription.planType} → ${planType}`);
          return res.status(400).json({ 
            error: "downgrade_not_allowed",
            message: "Downgrade de plano não é permitido. Entre em contato com o suporte.",
            currentPlan: subscription.planType,
            requestedPlan: planType,
            nextBillingDate: subscription.nextBillingDate
          });
        }
      }
    }

    // CASO 1: Cliente já tem plano ATIVO e quer fazer UPGRADE
    if (subscription && subscription.status === 'active') {
      const now = new Date();
      const isActive = subscription.nextBillingDate && new Date(subscription.nextBillingDate) > now;
      
      if (isActive) {
        // UPGRADE: Calcular valor proporcional
        try {
          const webhookToken = crypto.randomBytes(16).toString("hex");
          const daysRemaining = Math.ceil((new Date(subscription.nextBillingDate) - now) / (1000 * 60 * 60 * 24));
          const currentPlanConfig = getPlanConfig(subscription.planType);
          const newPlanConfig = getPlanConfig(planType);
          
          // Valor já pago proporcional aos dias restantes
          const paidProportional = Math.round((currentPlanConfig.amount * daysRemaining) / 30);
          // Valor do novo plano proporcional aos dias restantes
          const newPlanProportional = Math.round((newPlanConfig.amount * daysRemaining) / 30);
          // Diferença a ser cobrada
          const upgradeAmount = Math.max(0, newPlanProportional - paidProportional);

          console.log(`📈 Upgrade solicitado: ${subscription.planType} → ${planType}`);
          console.log(`   Dias restantes: ${daysRemaining}`);
          console.log(`   Valor proporcional já pago: R$ ${(paidProportional / 100).toFixed(2)}`);
          console.log(`   Valor proporcional novo plano: R$ ${(newPlanProportional / 100).toFixed(2)}`);
          console.log(`   Diferença a cobrar: R$ ${(upgradeAmount / 100).toFixed(2)}`);

          // Gerar PIX com valor proporcional do upgrade
          const pixResponse = await createPixCharge({
            value: upgradeAmount,
            webhookUrl,
            description: `Upgrade para ${planType === 'voz_master' ? 'Voz Master' : 'Voz Pro'} (proporcional ${daysRemaining} dias)`,
            metadata: {
              userId: String(user._id),
              planType,
              isUpgrade: true,
              daysRemaining,
              originalPlan: subscription.planType,
              webhookToken,
            },
          });

          const pixId = pixResponse?.id;
          if (!pixId) {
            console.error("PushinPay response missing ID:", pixResponse);
            return res.status(502).json({ error: "invalid_pix_response" });
          }

          const upgradePayment = {
            pixId,
            value: upgradeAmount,
            status: "pending",
            payload: { 
              ...pixResponse, 
              isUpgrade: true, 
              originalPlan: subscription.planType, 
              daysRemaining,
              metadata: { ...(pixResponse?.metadata || {}), userId: String(user._id), planType, isUpgrade: true, daysRemaining, originalPlan: subscription.planType, webhookToken }
            },
            createdAt: new Date(),
          };

          subscription.payments.push(upgradePayment);
          await subscription.save();

          const planNames = {
            voz_pro: 'Voz Pro',
            voz_master: 'Voz Master',
            voz_plus_master: 'Plus Master'
          };
          
          return res.status(201).json({
            subscriptionId: subscription._id,
            userId: user._id,
            status: subscription.status,
            planType: subscription.planType,
            requestedPlan: planType,
            isUpgrade: true,
            upgradeAmount,
            daysRemaining,
            pixCopyAndPaste: pixResponse.qr_code || pixResponse.qrCode || pixResponse.brcode || pixResponse.emv,
            pixQrCodeBase64: pixResponse.qr_code_base64 || pixResponse.qrCodeBase64 || pixResponse.qrCodeImage,
            transactionId: pixResponse.id,
            message: `Upgrade para ${planNames[planType] || planType}. Valor proporcional: R$ ${(upgradeAmount / 100).toFixed(2)}`
          });
        } catch (err) {
          console.error("Erro ao processar upgrade:", err);
          return res.status(500).json({ error: "upgrade_processing_failed" });
        }
      }
    }

    // CASO 2: Verificar se já existe pagamento pendente para ESTE PLANO (reutilizar)
    const existingPendingForPlan = subscription
      ? subscription.payments.filter(p => {
          if (p.status !== "pending") return false;
          if (p.payload?.isUpgrade) return false; // Ignorar pagamentos de upgrade
          
          // Verificar expiração (15 minutos)
          const createdAt = p.createdAt || p.payload?.created_at;
          if (!createdAt) return true;
          const expiresAt = new Date(new Date(createdAt).getTime() + 15 * 60 * 1000);
          if (new Date() >= expiresAt) return false;

          // Buscar planType nos metadados
          const paymentPlanType = p.payload?.metadata?.planType || p.payload?.planType;
          
          // ⚠️ VALIDAÇÃO CRÍTICA: Valor DEVE ser exatamente igual ao preço atual do plano
          const paymentValue = typeof p.value === 'string' ? Number(p.value) : p.value;
          const valueMatches = paymentValue === plan.amount;
          
          console.log(`🔍 Validando PIX pendente: planType=${paymentPlanType}, value=${paymentValue}, expected=${plan.amount}, matches=${valueMatches && paymentPlanType === planType}`);
          
          // Ambos devem ser true: planType correto E valor correto
          return paymentPlanType === planType && valueMatches;
        }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
      : null;

    if (existingPendingForPlan) {
      const paymentValue = typeof existingPendingForPlan.value === 'string' ? Number(existingPendingForPlan.value) : existingPendingForPlan.value;
      console.log(`♻️ Reutilizando PIX pendente: plano=${planType}, valor=R$ ${(paymentValue / 100).toFixed(2)}`);
      
      const planNames = {
        voz_pro: 'Voz Pro',
        voz_master: 'Voz Master',
        voz_plus_master: 'Plus Master'
      };
      
      return res.status(200).json({
        subscriptionId: subscription._id,
        userId: user._id,
        status: subscription.status,
        planType: planType,
        displayPlanType: planType,
        pixCopyAndPaste: existingPendingForPlan.payload?.qr_code,
        pixQrCodeBase64: existingPendingForPlan.payload?.qr_code_base64,
        transactionId: existingPendingForPlan.pixId,
        pending: true,
        reused: true,
        monthlyAmount: plan.amount,
        displayMonthlyAmount: paymentValue,
        message: `Reutilizando código PIX para o plano ${planNames[planType] || planType}`
      });
    }

    // CASO 3: Criar novo PIX para o plano solicitado (múltiplos PIX podem coexistir)

    const webhookToken = crypto.randomBytes(16).toString("hex");
    const pixResponse = await createPixCharge({
      value: plan.amount,
      webhookUrl,
      description: plan.description,
      metadata: {
        userId: String(user._id),
        planType,
        webhookToken,
      },
    });

    const pixId = pixResponse?.id;
    if (!pixId) {
      console.error("PushinPay response missing ID:", pixResponse);
      return res.status(502).json({ error: "invalid_pix_response" });
    }

    console.log("PushinPay response keys:", Object.keys(pixResponse));
    console.log("QR Code available:", {
      hasQrCode: !!pixResponse.qr_code,
      hasQrCodeBase64: !!pixResponse.qr_code_base64,
      hasQrCodeImage: !!pixResponse.qrCodeImage,
      hasQrCodeUrl: !!pixResponse.qrCodeUrl
    });

    const paymentRecord = {
      pixId,
      value: plan.amount,
      status: "pending",
      payload: { 
        ...pixResponse,
        metadata: { ...(pixResponse?.metadata || {}), userId: String(user._id), planType, webhookToken }
      },
      createdAt: new Date(),
    };

    if (!subscription) {
      subscription = await Subscription.create({
        userId: user._id,
        email: user.email,
        planType,
        status: "pending",
        paymentMethod: "pix",
        monthlyAmount: plan.amount,
        currency: plan.currency,
        nextBillingDate: new Date(),
        payments: [paymentRecord],
      });
    } else {
      subscription.planType = planType;
      subscription.email = user.email;
      subscription.status = "pending";
      subscription.paymentMethod = "pix";
      subscription.monthlyAmount = plan.amount;
      subscription.currency = plan.currency;
      subscription.nextBillingDate = new Date();
      subscription.payments.push(paymentRecord);
      await subscription.save();
    }

    return res.status(201).json({
      subscriptionId: subscription._id,
      userId: user._id,
      status: subscription.status,
      planType: planType,
      displayPlanType: planType,
      monthlyAmount: plan.amount,
      displayMonthlyAmount: plan.amount,
      pixCopyAndPaste: pixResponse.qr_code || pixResponse.qrCode || pixResponse.brcode || pixResponse.emv,
      pixQrCodeBase64: pixResponse.qr_code_base64 || pixResponse.qrCodeBase64 || pixResponse.qrCodeImage,
      transactionId: pixId,
      pending: true,
      reused: false,
      message: `Gerado código PIX para o plano ${plan.description}`
    });
  } catch (error) {
    console.error("startSubscription error", error);
    return res.status(500).json({ error: "subscription_creation_failed" });
  }
}

export async function getSubscriptionStatus(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "user_identifier_required" });
    }

    // Only allow querying own status
    if (!req.user?._id || String(req.user._id) !== String(userId)) {
      return res.status(403).json({ error: "forbidden" });
    }

    let subscription = null;
    const objectId = sanitizeObjectId(userId);
    if (objectId) {
      subscription = await Subscription.findOne({ userId: objectId }).lean();
    }

    if (!subscription) {
      return res.status(404).json({ error: "subscription_not_found" });
    }

    const now = new Date();
    const lastPayment = subscription.payments?.at(-1) || null;
    const pendingPayment = [...(subscription.payments || [])].reverse().find(
      (payment) => payment.status === "pending"
    ) || null;

    const active =
      subscription.status === "active" &&
      subscription.nextBillingDate &&
      new Date(subscription.nextBillingDate) > now;

    // Compute effective plan from authoritative user doc when not active
    let effectivePlanType = subscription.planType;
    try {
      const user = await User.findById(subscription.userId).lean();
      if (!active) {
        effectivePlanType = user?.plan || "free";
      }
    } catch {}

    const sanitizePayment = (payment) => {
      if (!payment) return null;

      const value = typeof payment.value === "string" ? Number(payment.value) : payment.value;

      return {
        pixId: payment.pixId,
        status: payment.status,
        value,
        createdAt: payment.createdAt,
        paidAt: payment.paidAt,
        expiresAt: payment.expiresAt,
        isUpgrade: payment.payload?.isUpgrade ?? false,
        originalPlan: payment.payload?.originalPlan,
        daysRemaining: payment.payload?.daysRemaining,
      };
    };

    const requestedPlanType = pendingPayment?.payload?.metadata?.planType || null;
    const displayPlanType = active
      ? subscription.planType
      : (requestedPlanType || effectivePlanType);

    const requestedAmount = pendingPayment ? (typeof pendingPayment.value === "string" ? Number(pendingPayment.value) : pendingPayment.value) : null;
    const displayMonthlyAmount = active ? subscription.monthlyAmount : (requestedAmount || subscription.monthlyAmount);

    return res.json({
      subscriptionId: subscription._id,
      planType: subscription.planType,
      effectivePlanType,
      requestedPlanType,
      displayPlanType,
      status: subscription.status,
      active,
      monthlyAmount: subscription.monthlyAmount,
      displayMonthlyAmount,
      nextBillingDate: subscription.nextBillingDate,
      lastPayment: sanitizePayment(lastPayment),
      pendingPayment: sanitizePayment(pendingPayment),
    });
  } catch (error) {
    console.error("getSubscriptionStatus error", error);
    return res.status(500).json({ error: "subscription_status_failed" });
  }
}

export function advanceBillingCycle(subscription) {
  const now = new Date();
  subscription.status = "active";
  subscription.lastPaymentAt = now;
  const baseDate =
    subscription.nextBillingDate && new Date(subscription.nextBillingDate) > now
      ? new Date(subscription.nextBillingDate)
      : now;
  subscription.nextBillingDate = addMonths(baseDate, 1);
}
