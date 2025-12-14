import mongoose from "mongoose";
import { User } from "./User.js";

const SubscriptionSchema = new mongoose.Schema(
  {
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
    status: {
      type: String,
      enum: ["pending", "active", "expired", "canceled"],
      required: true,
      default: "pending",
      index: true,
    },
    value: {
      type: Number,
      required: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    // Refer\u00eancia ao pagamento que ativou esta assinatura
    activatingPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      default: null,
    },
    // Hist\u00f3rico de renova\u00e7\u00f5es
    renewalHistory: [{
      date: Date,
      paymentId: mongoose.Schema.Types.ObjectId,
      previousExpiresAt: Date,
      newExpiresAt: Date,
    }],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// \u00cdndices compostos
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ status: 1, expiresAt: 1 });
SubscriptionSchema.index({ userId: 1, status: 1, expiresAt: -1 });

// M\u00e9todo para ativar assinatura e sincronizar com User
SubscriptionSchema.methods.activate = async function (durationDays = 30, paymentId = null) {
  const previousExpiresAt = this.expiresAt;
  
  this.status = "active";
  this.startedAt = this.startedAt || new Date();
  this.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  
  if (paymentId) {
    this.activatingPaymentId = paymentId;
    this.renewalHistory.push({
      date: new Date(),
      paymentId,
      previousExpiresAt,
      newExpiresAt: this.expiresAt,
    });
  }
  
  await this.save();
  
  // Sincronizar com User automaticamente
  await this.syncWithUser();
  
  console.log(`[SUBSCRIPTION] Ativada: ${this.plan} para user ${this.userId}, expira em ${this.expiresAt}`);
  
  return this;
};

// M\u00e9todo para sincronizar com User
SubscriptionSchema.methods.syncWithUser = async function() {
  try {
    const user = await User.findById(this.userId);
    if (user) {
      await user.updatePlanFromSubscription(this);
    }
  } catch (error) {
    console.error(`[SUBSCRIPTION SYNC] Erro ao sincronizar com user ${this.userId}:`, error);
  }
};

// M\u00e9todo para cancelar assinatura
SubscriptionSchema.methods.cancel = async function () {
  this.status = "canceled";
  this.canceledAt = new Date();
  await this.save();
  
  // Atualizar User para free
  const user = await User.findById(this.userId);
  if (user) {
    await user.updatePlanFromSubscription(null);
  }
  
  console.log(`[SUBSCRIPTION] Cancelada para user ${this.userId}`);
  
  return this;
};

// M\u00e9todo para expirar assinatura
SubscriptionSchema.methods.expire = async function () {
  this.status = "expired";
  await this.save();
  
  // Atualizar User para free
  const user = await User.findById(this.userId);
  if (user) {
    await user.updatePlanFromSubscription(null);
  }
  
  console.log(`[SUBSCRIPTION] Expirada para user ${this.userId}`);
  
  return this;
};

// M\u00e9todo para renovar assinatura
SubscriptionSchema.methods.renew = async function (durationDays = 30, paymentId = null) {
  if (this.status !== "active") {
    throw new Error("Apenas assinaturas ativas podem ser renovadas");
  }
  
  const previousExpiresAt = this.expiresAt;
  this.expiresAt = new Date(this.expiresAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  
  if (paymentId) {
    this.renewalHistory.push({
      date: new Date(),
      paymentId,
      previousExpiresAt,
      newExpiresAt: this.expiresAt,
    });
  }
  
  await this.save();
  await this.syncWithUser();
  
  console.log(`[SUBSCRIPTION] Renovada: ${this.plan} para user ${this.userId}, nova expira\u00e7\u00e3o: ${this.expiresAt}`);
  
  return this;
};

// Verifica\u00e7\u00f5es
SubscriptionSchema.methods.isActive = function () {
  return this.status === "active" && this.expiresAt && this.expiresAt > new Date();
};

SubscriptionSchema.methods.isPending = function () {
  return this.status === "pending";
};

SubscriptionSchema.methods.isExpired = function () {
  return this.status === "expired" || (this.expiresAt && this.expiresAt <= new Date());
};

// M\u00e9todos est\u00e1ticos
SubscriptionSchema.statics.findActiveByUser = function (userId) {
  return this.findOne({
    userId,
    status: "active",
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });
};

// M\u00e9todo para expirar automaticamente assinaturas vencidas
SubscriptionSchema.statics.expireOldSubscriptions = async function() {
  const now = new Date();
  const expiredSubs = await this.find({
    status: "active",
    expiresAt: { $lt: now }
  });
  
  for (const sub of expiredSubs) {
    await sub.expire();
  }
  
  console.log(`[SUBSCRIPTION CLEANUP] ${expiredSubs.length} assinaturas expiradas processadas`);
  
  return expiredSubs.length;
};

// Hook p\u00f3s-save: sincronizar com User automaticamente
SubscriptionSchema.post('save', async function(doc) {
  // Sincronizar apenas se for uma mudan\u00e7a de status
  if (doc.wasNew || doc.isModified('status') || doc.isModified('expiresAt')) {
    await doc.syncWithUser();
  }
});

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);

export default Subscription;
