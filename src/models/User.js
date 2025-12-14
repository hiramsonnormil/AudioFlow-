import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false }, // Optional for Google OAuth users
    googleId: { type: String, sparse: true, unique: true }, // Google OAuth ID
    authProvider: { type: String, enum: ["local", "google", "both"], default: "local" },
    plan: {
      type: String,
      enum: ["free", "voz_pro", "voz_master", "voz_plus_master", "plano_plus_master"],
      default: "free",
    },
    // Referência à assinatura ativa (para queries rápidas)
    activeSubscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      default: null,
    },
    // Status da assinatura (cache para performance)
    subscriptionStatus: {
      type: String,
      enum: ["none", "active", "pending", "expired", "canceled"],
      default: "none",
    },
    // Data de expiração da assinatura (cache)
    subscriptionExpiresAt: {
      type: Date,
      default: null,
    },
    usageHistory: {
      type: [{ timestamp: Date }],
      default: [],
    },
  },
  { timestamps: true }
);

// Índices para queries otimizadas
UserSchema.index({ email: 1 });
UserSchema.index({ activeSubscription: 1 });
UserSchema.index({ subscriptionStatus: 1, subscriptionExpiresAt: 1 });

// Método para atualizar plano baseado na assinatura
UserSchema.methods.updatePlanFromSubscription = async function(subscription) {
  if (!subscription) {
    this.plan = "free";
    this.activeSubscription = null;
    this.subscriptionStatus = "none";
    this.subscriptionExpiresAt = null;
  } else {
    this.plan = subscription.plan;
    this.activeSubscription = subscription._id;
    this.subscriptionStatus = subscription.status;
    this.subscriptionExpiresAt = subscription.expiresAt;
  }
  await this.save();
  console.log(`[USER SYNC] Plano atualizado para ${this.email}: ${this.plan} (${this.subscriptionStatus})`);
  return this;
};

// Método estático para sincronizar todos os usuários com assinaturas expiradas
UserSchema.statics.syncExpiredSubscriptions = async function() {
  const now = new Date();
  const result = await this.updateMany(
    {
      subscriptionStatus: "active",
      subscriptionExpiresAt: { $lt: now }
    },
    {
      $set: {
        plan: "free",
        subscriptionStatus: "expired",
        activeSubscription: null
      }
    }
  );
  console.log(`[USER SYNC] ${result.modifiedCount} usuários com assinaturas expiradas sincronizados`);
  return result;
};

// Método virtual para verificar se tem assinatura ativa
UserSchema.virtual("hasActiveSubscription").get(function() {
  return this.subscriptionStatus === "active" && 
         this.subscriptionExpiresAt && 
         this.subscriptionExpiresAt > new Date();
});

// Garantir que virtuals sejam incluídos em JSON
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

export const User = mongoose.model("User", UserSchema);

export default User;
