/**
 * Service: Audio Processing
 * Gerencia o processamento de áudio com FFmpeg
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export class AudioProcessingService {
  constructor(storagePath) {
    this.storagePath = storagePath;
  }

  /**
   * Constrói a string de filtro de áudio com base no preset
   */
  buildAudioFilter(preset, durationSec) {
    if (preset === "SLOWED") {
      // Slowdown simples com preservação de pitch (0.88x)
      return [`rubberband=tempo=0.88:pitch=1.0`, `loudnorm=I=-14:TP=-1.0`].join(
        ","
      );
    }

    if (preset === "SPEED_125") {
      // Speed up simples com preservação de pitch (1.25x)
      return [`rubberband=tempo=1.25:pitch=1.0`, `loudnorm=I=-14:TP=-1.0`].join(
        ","
      );
    }

    if (preset === "ULTRA_SLOWED") {
      // Drone etéreo: tempo 0.12× (paulstretch-like), reverb longo (100ms), lowpass 8kHz para tail limpo, highpass 30Hz anti-mud
      return [
        `rubberband=tempo=0.12:pitch=1.0`,
        `aecho=0.7:0.5:100:0.25`,
        `lowpass=f=8000`,
        `highpass=f=30`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "MUFFLED_SLOWED") {
      // Abafado: lowpass 300Hz, tempo 0.85×, pitch 0.95, reverb sala 60ms
      return [
        `lowpass=f=300`,
        `rubberband=tempo=0.85:pitch=0.95`,
        `aecho=0.4:0.5:60:0.15`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "MUFFLED_SPEED") {
      // Abafado acelerado: lowpass 600Hz (intelligibilidade), tempo 1.25×, pitch 1.05 (body), sem reverb
      return [
        `lowpass=f=600`,
        `rubberband=tempo=1.25:pitch=1.05`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "DAYCORE") {
      // Tempo 80% + pitch down 0.8 (~-4 semitons) + reverb leve
      return [
        `rubberband=tempo=0.8:pitch=0.8`,
        `aecho=0.3:0.4:30:0.15`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "NIGHTCORE") {
      // Tempo 135% + pitch 1.35 (~5-6 semitons)
      return [
        `rubberband=tempo=1.35:pitch=1.35`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // Default fallback
    return `loudnorm=I=-14:TP=-1.0`;
  }

  /**
   * Processa áudio com FFmpeg
   */
  processAudio(inputStream, outputPath, audioFilterStr, durationSec, jobId) {
    return new Promise((resolve, reject) => {
      const durationMs = Math.round(durationSec * 1000);

      const ffArgs = [
        "-i",
        "-",
        "-af",
        audioFilterStr,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        "-progress",
        "pipe:1",
        "-y",
        outputPath,
      ];

      const ff = spawn("ffmpeg", ffArgs);
      let ffStderr = "";
      const progressCallback = (percent) => {
        // Callback será chamado durante o processamento
      };

      ff.stdout.on("data", (chunk) => {
        const s = String(chunk);
        const m = s.match(/out_time_ms=(\d+)/);
        if (m && durationMs > 0) {
          const outMs = parseInt(m[1], 10);
          const percent = Math.min(99, Math.round((outMs / durationMs) * 100));
          progressCallback(percent);
        }
      });

      ff.stderr.on("data", (d) => {
        ffStderr += String(d);
      });

      ff.on("error", (err) => {
        console.error(`[${jobId}] ffmpeg spawn error:`, err.message);
        inputStream.process?.kill?.();
        reject(err);
      });

      inputStream.process?.on?.("error", (err) => {
        console.error(`[${jobId}] input source error:`, err.message);
        ff.kill();
        reject(err);
      });

      ff.on("close", (code) => {
        if (code === 0) {
          console.log(`[${jobId}] ffmpeg completed successfully`);
          resolve({ success: true, file: outputPath });
        } else {
          const errorMsg = `ffmpeg exit code ${code}: ${ffStderr.slice(-500)}`;
          console.error(`[${jobId}] ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      });

      // Pipe input para FFmpeg
      inputStream.stream.pipe(ff.stdin);
    });
  }

  /**
   * Gera um nome de arquivo único
   */
  generateUniqueFilename(baseTitle, preset, outputDir) {
    let sanitized = baseTitle
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_")
      .substring(0, 50)
      .toLowerCase();

    if (!sanitized || sanitized.trim() === "") {
      sanitized = "audio";
    }

    const baseName = `${sanitized}_${preset}`;
    let filename = `${baseName}.mp3`;
    let counter = 1;

    while (fs.existsSync(path.join(outputDir, filename))) {
      filename = `${baseName}_${counter}.mp3`;
      counter++;
    }

    return filename;
  }
}
