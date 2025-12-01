/**
 * Service: Audio Processing
 * Gerencia o processamento de áudio com FFmpeg e upload para R2
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import * as r2 from "../../storage/r2.js";

export class AudioProcessingService {
  constructor(storagePath) {
    this.storagePath = storagePath;
  }

  /**
   * Constrói a string de filtro de áudio com base no preset
   */
  buildAudioFilter(preset, durationSec) {
    // 1. SLOWED - Tempo 0.75× preservando pitch
    if (preset === "SLOWED") {
      return [`atempo=0.75`, `loudnorm=I=-14:TP=-1.0`].join(",");
    }

    // 2. SPEED UP - Tempo 1.5× preservando pitch
    if (preset === "SPEED_125") {
      return [`atempo=1.5`, `loudnorm=I=-14:TP=-1.0`].join(",");
    }

    // 4. NIGHTCORE - Rápido + pitch agudo usando asetrate (1.25×)
    if (preset === "NIGHTCORE") {
      return [
        `asetrate=44100*1.25`,
        `aresample=44100`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 5. DAYCORE - Lento + pitch grave usando asetrate (0.80×)
    if (preset === "DAYCORE") {
      return [
        `asetrate=44100*0.80`,
        `aresample=44100`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 6. MUFFLED SLOWED - Lento abafado com lowpass 3000Hz
    if (preset === "MUFFLED_SLOWED") {
      return [
        `lowpass=f=3000`,
        `atempo=0.75`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 7. MUFFLED SPEED - Rápido abafado com lowpass 3000Hz
    if (preset === "MUFFLED_SPEED") {
      return [
        `lowpass=f=3000`,
        `atempo=1.5`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 8. PHONA - Efeito telefone (bandpass 300Hz-3400Hz)
    if (preset === "PHONA") {
      return [
        `highpass=f=300`,
        `lowpass=f=3400`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 9. ECHO - Eco clássico com delay 800ms
    if (preset === "ECHO") {
      return [
        `aecho=0.6:0.5:800:0.3`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 10. REVERB - Reverberação atmosférica com múltiplos ecos
    if (preset === "REVERB") {
      return [
        `aecho=0.5:0.6:40|60|80:0.4|0.3|0.2`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 11. BASS BOOST - Graves potentes +12dB
    if (preset === "BASS_BOOST") {
      return [
        `bass=g=12:f=100:w=0.6`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 12. ROBOT VOICE - Voz robótica metálica
    if (preset === "ROBOT_VOICE") {
      return [
        `afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)'`,
        `aecho=0.3:0.4:50:0.2`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    // 13. 8D AUDIO - Som girando 360° (apulsator com frequência baixa)
    if (preset === "8D") {
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
      console.log(`[${jobId}] Iniciando processamento com upload para R2`);

      // 1. Gera arquivo temporário
      const filename = `${jobId}.mp3`;
      tempPath = path.join('/tmp', filename);

      // 2. Processa áudio com FFmpeg (salva em /tmp)
      const audioFilterStr = this.buildAudioFilter(preset, durationSec);
      await this.processAudio(inputStream, tempPath, audioFilterStr, durationSec, jobId);

      if (!fs.existsSync(tempPath)) {
        throw new Error('FFmpeg não gerou o arquivo de saída');
      }

      console.log(`[${jobId}] Arquivo processado: ${tempPath}`);

      // 3. Define a chave no R2 (estrutura: free/<userId>/<jobId>.mp3)
      const r2Key = `free/${userId}/${filename}`;

      // 4. Faz upload para R2
      const uploadResult = await r2.uploadFile(tempPath, r2Key, {
        userId,
        jobId,
        preset,
        title,
      });

      console.log(`[${jobId}] Upload concluído: ${uploadResult.publicUrl}`);

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
        console.log(`[${jobId}] Limpando arquivo temporário após erro`);
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
