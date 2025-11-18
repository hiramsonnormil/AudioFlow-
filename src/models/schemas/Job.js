/**
 * Schema: Job
 * Modelo de job de processamento de áudio com persistência
 */

import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "DOWNLOADING", "EXTRACTING", "PROCESSING", "DONE", "ERROR"],
      default: "PENDING",
      index: true,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    inputUrl: {
      type: String,
      required: true,
    },
    outputPath: {
      type: String,
      default: null,
    },
    filename: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    preset: {
      type: String,
      required: true,
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    metadata: {
      title: String,
      thumbnail: String,
      duration: Number,
      videoId: String,
      artist: String,
    },
    processingTime: {
      type: Number, // em segundos
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "jobs",
  }
);

// Índices para performance de queries
jobSchema.index({ userId: 1, createdAt: -1 });
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ jobId: 1 });

// TTL para limpeza automática de jobs antigos (30 dias)
jobSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 2592000,
    partialFilterExpression: { status: { $in: ["DONE", "ERROR"] } },
  }
);

export const Job = mongoose.model("Job", jobSchema);
