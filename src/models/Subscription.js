import mongoose from "mongoose";

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planType: {
      type: String,
      enum: ["premium_30"],
      required: true,
      default: "premium_30",
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["pix", "credit_card"],
      required: true,
    },
    pushinpayTransactionId: {
      type: String,
      required: true,
      index: true,
    },
    pushinpayPaymentId: {
      type: String,
      index: true,
    },
    amount: {
      type: Number,
      required: true, // valor em centavos
    },
    currency: {
      type: String,
      default: "BRL",
    },
    startsAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    webhookData: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

// Índice composto para buscas eficientes
SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ pushinpayTransactionId: 1 });

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);











