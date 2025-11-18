/**
 * Schema: User
 * Modelo de usuário com histórico de planos
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /.+\@.+\..+/,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "premium"],
      default: "free",
    },
    jobsProcessed: {
      type: Number,
      default: 0,
    },
    storageUsed: {
      type: Number, // em bytes
      default: 0,
    },
    subscriptionStart: {
      type: Date,
      default: null,
    },
    subscriptionEnd: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

// Índices para performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

export const User = mongoose.model("User", userSchema);
