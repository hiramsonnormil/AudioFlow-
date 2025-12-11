import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    pixId: { type: String, required: true },
    value: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "expired", "cancelled"],
      default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
    payload: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const SubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    planType: {
      type: String,
      enum: ["voz_pro", "voz_master", "voz_plus_master"],
      default: "voz_pro",
    },
    status: {
      type: String,
      enum: ["pending", "active", "past_due", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["pix"],
      default: "pix",
      required: true,
    },
    monthlyAmount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "BRL",
    },
    nextBillingDate: {
      type: Date,
      default: Date.now,
    },
    lastPaymentAt: {
      type: Date,
    },
    payments: {
      type: [PaymentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ userId: 1 }, { unique: true });
SubscriptionSchema.index({ "payments.pixId": 1 }, { unique: true, sparse: true });

export const Subscription = mongoose.model("Subscription", SubscriptionSchema);











