/**
 * Schema: Preset
 * Modelo de presets de áudio
 */

import mongoose from "mongoose";

const presetSchema = new mongoose.Schema(
  {
    presetId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: null,
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    config: {
      // Configurações específicas do efeito
      tempo: Number,
      pitch: Number,
      filters: [String],
      reverb: Number,
    },
  },
  {
    timestamps: true,
    collection: "presets",
  }
);

presetSchema.index({ enabled: 1 });

export const Preset = mongoose.model("Preset", presetSchema);
