import mongoose from "mongoose";
import { Subscription } from "./Subscription.js";
import { User } from "./User.js";

const PaymentSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["pushinpay"],
      required: true,
      default: "pushinpay",
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["voz_plus_master", "voz_pro", "voz_master"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 50, // mínimo 50 centavos
    },
    status: {
      type: String,
      enum: ["created", "pending", "paid", "expired", "canceled"],
      required: true,
      default: "created",
      index: true,
    },
    endToEndId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    payer: {
      name: {
        type: String,
        default: null,
      },
      document: {
        type: String,
        default: null,
      },
    },
    qrCode: {
      type: String,
      default: null,
    },
    qrCodeBase64: {
      type: String,
      default: null,
    },
    metadata: {
      expiresAt: Date,
      pixId: String,
      correlationId: String,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Índices compostos para queries eficientes
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ transactionId: 1, status: 1 });
PaymentSchema.index({ subscriptionId: 1 });
PaymentSchema.index({ status: 1, createdAt: -1 });

// Método para processar pagamento confirmado e ativar assinatura
PaymentSchema.methods.markAsPaid = async function (paymentData = {}) {
  this.status = "paid";
  this.paidAt = new Date();
  
  if (paymentData.endToEndId) this.endToEndId = paymentData.endToEndId;
  if (paymentData.payerName) this.payer.name = paymentData.payerName;
  if (paymentData.payerDocument) this.payer.document = paymentData.payerDocument;
  
  await this.save();
  
  console.log(`[PAYMENT] Pagamento confirmado: ${this.transactionId} - R$ ${(this.value / 100).toFixed(2)}`);
  
  // Ativar assinatura automaticamente
  await this.activateSubscription();
  
  return this;
};

// Método para ativar a assinatura relacionada
PaymentSchema.methods.activateSubscription = async function() {
  try {
    const subscription = await Subscription.findById(this.subscriptionId);
    
    if (!subscription) {
      console.error(`[PAYMENT] Subscription ${this.subscriptionId} não encontrada`);
      return;
    }
    
    // Determinar duração baseada no plano
    const durationMap = {
      "voz_plus_master": 30,
      "voz_pro": 30,
      "voz_master": 30,
    };
    
    const duration = durationMap[this.plan] || 30;
    
    // Se a subscription já está ativa, renovar. Senão, ativar
    if (subscription.status === "active" && subscription.isActive()) {
      await subscription.renew(duration, this._id);
      console.log(`[PAYMENT] Assinatura ${subscription._id} renovada por ${duration} dias`);
    } else {
      await subscription.activate(duration, this._id);
      console.log(`[PAYMENT] Assinatura ${subscription._id} ativada por ${duration} dias`);
    }
    
    // Verificar sincronização com User
    const user = await User.findById(this.userId);
    if (user && user.plan !== this.plan) {
      console.log(`[PAYMENT] Sincronizando plano do User ${user.email}: ${user.plan} -> ${this.plan}`);
      await user.updatePlanFromSubscription(subscription);
    }
    
  } catch (error) {
    console.error(`[PAYMENT] Erro ao ativar subscription:`, error);
    throw error;
  }
};

// Verificações
PaymentSchema.methods.isPaid = function () {
  return this.status === "paid";
};

PaymentSchema.methods.isPending = function () {
  return this.status === "pending" || this.status === "created";
};

PaymentSchema.methods.isExpired = function () {
  return this.status === "expired";
};

// Método estático para encontrar pagamentos pendentes de um usuário
PaymentSchema.statics.findPendingByUser = function(userId) {
  return this.find({
    userId,
    status: { $in: ["created", "pending"] }
  }).sort({ createdAt: -1 });
};

// Hook pós-save: Se o status mudar para "paid", ativar automaticamente
PaymentSchema.post('save', async function(doc) {
  if (doc.isModified('status') && doc.status === 'paid' && !doc.paidAt) {
    // Evitar loop infinito: apenas processar se ainda não tem paidAt
    doc.paidAt = new Date();
    await doc.activateSubscription();
  }
});

export const Payment = mongoose.model("Payment", PaymentSchema);

export default Payment;
