/**
 * Service: Audio Processing
 * Gerencia o processamento de áudio com FFmpeg e upload para R2
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import {
  isDurationTooLong,
  buildDurationLimitMessage,
} from "../config/audioLimits.js";
import * as r2 from "../../storage/r2.js";
import { getUserIdentity } from "../config/security.js";

export class AudioProcessingService {
  constructor(storagePath) {
    this.storagePath = storagePath;
  }

  /**
   * Constrói a string de filtro de áudio com base no preset
   */
  buildAudioFilter(preset, durationSec) {
    // FILTROS ORIGINAIS (com rubberband)
    if (preset === "SLOWED") {
      // Slowdown simples com preservação de pitch (0.88x)
      return [`rubberband=tempo=0.88:pitch=1.0`, `loudnorm=I=-14:TP=-1.0`].join(
        ","
      );
    }

    if (preset === "SLOWED_REVERB") {
      // Slowed + Reverb profissional: asetrate para slowed, reverb com múltiplos ecos, noise reduction
      return [
        `asetrate=44100*0.88`,
        `aresample=44100`,
        `aecho=0.8:0.88:60|90|120:0.5|0.4|0.3`,
        `afftdn=nf=-25`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
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

    // NOVOS FILTROS
    if (preset === "PHONA") {
      // Efeito telefone (bandpass 300Hz-3400Hz)
      return [
        `highpass=f=300`,
        `lowpass=f=3400`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "ECHO") {
      // Eco clássico com delay 800ms
      return [
        `aecho=0.6:0.5:800:0.3`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "REVERB") {
      // Reverberação atmosférica com múltiplos ecos
      return [
        `aecho=0.5:0.6:40|60|80:0.4|0.3|0.2`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "BASS_BOOST") {
      // Graves potentes +12dB
      return [
        `bass=g=12:f=100:w=0.6`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "ROBOT_VOICE") {
      // Voz robótica metálica
      return [
        `afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)'`,
        `aecho=0.3:0.4:50:0.2`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "8D") {
      // Som girando 360° (apulsator com frequência baixa)
      return [
        `apulsator=mode=sine:hz=0.125:width=0.9`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // Default fallback
    return `loudnorm=I=-14:TP=-1.0`;
  }

  /**
   * Processa áudio com FFmpeg
   * IMPORTANTE: Este método agora gera arquivo em /tmp, não na pasta definitiva
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
   * Processa áudio e faz upload para R2 (usuário free)
   * 
   * Fluxo completo:
   * 1. Gera arquivo temporário com FFmpeg em /tmp
   * 2. Faz upload para R2 no caminho free/<userId>/<jobId>.mp3
   * 3. Deleta arquivo temporário local
   * 4. Retorna URL pública do R2
   * 
   * @param {object} inputStream - Stream de áudio de entrada
   * @param {string} jobId - ID único do job
   * @param {string} userId - ID do usuário (para estrutura de pastas no R2)
   * @param {string} preset - Nome do preset aplicado
   * @param {number} durationSec - Duração do áudio em segundos
   * @param {string} title - Título do arquivo (metadata)
   * @returns {Promise<{publicUrl: string, key: string, localPath: string}>}
   */
  async processAndUploadToR2(inputStream, jobId, userId, preset, durationSec, title = 'audio') {
    let tempPath = null;

    try {
      const normalizedDuration =
        typeof durationSec === 'number' && Number.isFinite(durationSec)
          ? durationSec
          : parseFloat(durationSec) || 0;

      if (isDurationTooLong(normalizedDuration)) {
        console.warn(
          `[${jobId}] Abortado: duração ${normalizedDuration.toFixed(2)}s acima do limite`
        );
        throw new Error(buildDurationLimitMessage(normalizedDuration));
      }

      // 1. Gera arquivo temporário
      const filename = `${jobId}.mp3`;
      tempPath = path.join('/tmp', filename);

      // 2. Processa áudio com FFmpeg (salva em /tmp)
      const audioFilterStr = this.buildAudioFilter(preset, normalizedDuration);
      await this.processAudio(
        inputStream,
        tempPath,
        audioFilterStr,
        normalizedDuration,
        jobId
      );

      if (!fs.existsSync(tempPath)) {
        throw new Error('FFmpeg não gerou o arquivo de saída');
      }

      // 3. Define a chave no R2 (estrutura: free/<userId>/<jobId>.mp3)
      const safeUserFolder =
        typeof userId === "string" && /^[a-z0-9_-]+$/i.test(userId)
          ? userId
          : getUserIdentity("anonymous").storageKey;
      const r2Key = `free/${safeUserFolder}/${filename}`;

      // 4. Faz upload para R2
      const uploadResult = await r2.uploadFile(tempPath, r2Key, {
        userId,
        jobId,
        preset,
        title,
      });

      // 5. Deleta arquivo temporário local
      await r2.deleteLocalFile(tempPath);

      return {
        publicUrl: uploadResult.publicUrl,
        key: uploadResult.key,
        localPath: tempPath, // Para compatibilidade, mas arquivo já foi deletado
      };

    } catch (error) {
      // Em caso de erro, tenta limpar o arquivo temporário
      if (tempPath && fs.existsSync(tempPath)) {
        await r2.deleteLocalFile(tempPath).catch(() => { });
      }
      throw error;
    }
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
