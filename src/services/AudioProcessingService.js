/**
 * Service: Audio Processing
 * Gerencia o processamento de áudio com FFmpeg e upload para R2
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { validateAudioDuration } from "../utils/audioValidation.js";
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
        `lowpass=f=380`,
        `bass=g=9:f=75`,
        `rubberband=tempo=0.88:pitch=0.94`,
        `aecho=0.3:0.4:60:0.25`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "MUFFLED_SPEED") {
      // Abafado acelerado: lowpass 600Hz (intelligibilidade), tempo 1.25×, pitch 1.05 (body), sem reverb
      return [
        "lowpass=f=520",              // abafado controlado, ainda inteligível
        "highpass=f=120",             // remove o subgrave que suja quando acelera
        "bass=g=4:f=90",              // leve reforço pra deixar cheio
        "rubberband=tempo=1.22:pitch=1.04", // speed + corpo perfeito
        "loudnorm=I=-14:TP=-1"
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

    // ===== PLUS MASTER PRESETS =====
    
    if (preset === "BABY_VOICE") {
      // Voz aguda fofinha estilo TikTok. Pitch +35%, formant leve e EQ cristalina
      return [
        `asetrate=44100*1.35`,
        `aresample=44100`,
        `atempo=1.0`,
        `equalizer=f=200:t=h:width=200:g=-3`,
        `equalizer=f=3000:t=h:width=2000:g=4`,
        `afftdn=nf=-25`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "DEEP_VOICE") {
      // Voz grave cinematográfica. Pitch -20%, corte suave nos agudos e compressão limpa
      return [
        `asetrate=44100*0.80`,
        `aresample=44100`,
        `atempo=1.0`,
        `lowpass=f=6000`,
        `compand=attacks=0:decays=0:points=-80/-80|-20/-10|0/-2`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "VAPORWAVE_CLEAN") {
      // Vaporwave suave sem reverb pesado. Tempo 0.80, pitch -4%, equalização vintage
      return [
        `asetrate=44100*0.96`,
        `aresample=44100`,
        `atempo=0.80`,
        `equalizer=f=100:t=h:width=100:g=6`,
        `equalizer=f=800:t=h:width=400:g=-3`,
        `afftdn=nf=-22`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "RADIO_RETRO_AM") {
      // Som de rádio AM antigo. Bandpass 300–3500Hz + distorção leve
      return [
        `bandpass=f=1500:width_type=h:w=3000`,
        `acompressor=threshold=-20dB:ratio=2:attack=5:release=50`,
        `loudnorm=I=-18:TP=-1:LRA=11`,
      ].join(",");
    }

    if (preset === "CRYSTAL_SPEED") {
      // Speed Up cristalino. Tempo 1.35× sem distorção + brilho limpo
      return [
        `atempo=1.35`,
        `equalizer=f=3500:t=h:width=2500:g=5`,
        `afftdn=nf=-25`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "TAPE_WARP") {
      // Simulação de fita antiga. Wow/flutter, pitch drift e saturação vintage
      // Nota: rubberband não tem parâmetro "wow", usando efeito alternativo
      return [
        `rubberband=pitch=1.00:tempo=1.00:transients=crisp:formant=preserved`,
        `highpass=f=80`,
        `lowpass=f=12000`,
        `compand=attacks=0.02:decays=0.3:points=-80/-80|-30/-15|0/-5`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "WHISPER_CORE") {
      // Sussurro etéreo. Gate agressivo + brilho + reverb infinito
      return [
        `afftdn=nf=-30`,
        `highpass=f=200`,
        `equalizer=f=6000:t=h:width=3000:g=6`,
        `aecho=0.8:0.9:2000:0.5`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "GHOST_REVERB") {
      // Reverb fantasma. Predelay absurdo + decay muito longo + corte de agudos
      return [
        `aecho=0.6:0.7:1200:0.5`,
        `lowpass=f=4000`,
        `aecho=0.8:0.7:5000:0.6`,
        `loudnorm=I=-14:TP=-1.0`,
      ].join(",");
    }

    if (preset === "CHOIRIFY") {
      // Coro sintético. Chorus suave + micro desafinação + expansão estéreo
      return [
        `asplit=3[a][b][c]`,
        `[b]asetrate=44100*1.002,aresample=44100[bp]`,
        `[c]asetrate=44100*0.998,aresample=44100[cp]`,
        `[a][bp][cp]amix=inputs=3:weights=0.5 0.25 0.25:normalize=0[mixed]`,
        `[mixed]chorus=0.5:0.9:55|60|65:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.8[chorused]`,
        `[chorused]stereowiden=delay=20:feedback=0.2:crossfeed=0.15:drymix=0.85[widened]`,
        `[widened]loudnorm=I=-14:TP=-1.0`,
      ].join(";");
    }

    if (preset === "SUBHARMONIC_BASS") {
      // Grave enorme. Geração de sub-harmônicos com compressão segura
      return [
        `bass=g=8:f=80`,
        `compand=attacks=0:decays=0:points=-80/-80|-40/-10|0/-3`,
        `afftdn=nf=-20`,
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
      
      // Bitrate adaptativo baseado na duração (economiza espaço)
      const bitrate = durationSec > 600 ? "128k" : "192k"; // 128k para áudios > 10min

      // Detecta se o filtro usa sintaxe complexa (asplit, amix, etc.)
      const isComplexFilter = audioFilterStr.includes('[') || audioFilterStr.includes(';');
      const filterFlag = isComplexFilter ? "-filter_complex" : "-af";

      const ffArgs = [
        "-threads", "2",        // Limita threads para não sobrecarregar CPU
        "-i", "-",
        filterFlag, audioFilterStr,
        "-c:a", "libmp3lame",
        "-q:a", "2",           // Qualidade VBR (melhor compressão)
        "-compression_level", "5", // Balanço entre velocidade e compressão
        "-progress", "pipe:1",
        "-y",
        outputPath,
      ];

      // Ajuda na depuração de falhas do FFmpeg
      console.info("[FFmpeg] Iniciando processamento", {
        jobId,
        outputPath,
        durationSec,
        bitrate,
        filter: audioFilterStr,
      });

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
        console.error("[FFmpeg] Erro ao iniciar processo", {
          jobId,
          err: err.message,
        });
        inputStream.process?.kill?.();
        reject(err);
      });

      inputStream.process?.on?.("error", (err) => {
        console.error("[FFmpeg] Erro no stream de entrada", {
          jobId,
          err: err.message,
        });
        ff.kill();
        reject(err);
      });

      ff.on("close", (code) => {
        if (code === 0) {
          console.info("[FFmpeg] Processamento concluído", {
            jobId,
            outputPath,
          });
          resolve({ success: true, file: outputPath });
        } else {
          const errorMsg = `FFmpeg falhou (código ${code})`;
          const stderrOutput = ffStderr.trim();
          const stderrSnippet = stderrOutput
            .split("\n")
            .slice(-20)
            .join("\n")
            .slice(-4000);

          console.error("[FFmpeg] Falha no processamento", {
            jobId,
            code,
            outputPath,
            stderr: stderrSnippet,
          });

          const err = new Error(
            stderrSnippet
              ? `${errorMsg}: ${stderrSnippet}`
              : errorMsg
          );
          err.stderr = stderrOutput;
          err.ffmpegArgs = ffArgs;
          err.jobId = jobId;
          reject(err);
        }
      });

      // Pipe input para FFmpeg
      inputStream.stream.pipe(ff.stdin);
    });
  }

  /**
   * Processa áudio e faz upload para R2
   * 
   * Fluxo completo:
   * 1. Gera arquivo temporário com FFmpeg em /tmp
   * 2. Faz upload para R2 no caminho <tier>/<userId>/<jobId>.mp3
   * 3. Deleta arquivo temporário local
   * 4. Retorna URL pública do R2
   * 
   * @param {object} inputStream - Stream de áudio de entrada
   * @param {string} jobId - ID único do job
   * @param {string} userId - ID do usuário (para estrutura de pastas no R2)
   * @param {string} preset - Nome do preset aplicado
   * @param {number} durationSec - Duração do áudio em segundos
   * @param {string} title - Título do arquivo (metadata)
   * @param {string} userPlan - Plano do usuário (free, voz_pro, voz_master)
   * @returns {Promise<{publicUrl: string, key: string, localPath: string}>}
   */
  async processAndUploadToR2(inputStream, jobId, userId, preset, durationSec, title = 'audio', userPlan = 'free') {
    let tempPath = null;

    try {
      const normalizedDuration = validateAudioDuration(durationSec, jobId);

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

      // 3. Define a chave no R2 (estrutura: <tier>/<userId>/<jobId>.mp3)
      const safeUserFolder =
        typeof userId === "string" && /^[a-z0-9_-]+$/i.test(userId)
          ? userId
          : getUserIdentity("anonymous").storageKey;
      
      // Determinar tier baseado no plano
      const tier = (userPlan === 'voz_pro' || userPlan === 'voz_master' || userPlan === 'premium_30') 
        ? 'premium' 
        : 'free';
      
      const r2Key = `${tier}/${safeUserFolder}/${filename}`;

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
