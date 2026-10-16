/**
 * Service: Audio Processing
 * Gerencia o processamento de áudio com FFmpeg e upload para R2
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import https from "https";
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
    const filters = {
      "SLOWED": `aresample=48000,asetrate=48000*0.80,aresample=48000:resampler=soxr:precision=28:cutoff=0.97,asubboost=dry=0.6:wet=0.4:boost=3:decay=0.2:feedback=0.3:cutoff=90:slope=0.5,acompressor=threshold=0.1:ratio=3:attack=15:release=250:makeup=1.5:knee=6:detection=rms,dynaudnorm=framelen=250:gausssize=15:maxgain=12:compress=8,alimiter=limit=0.97:attack=5:release=50`,
      "DAYCORE": `aresample=48000,asetrate=48000*0.87,aresample=48000:resampler=soxr:precision=28:cutoff=0.96,treble=gain=-3:frequency=6500:width_type=h:width=3000,asubboost=dry=0.6:wet=0.4:boost=3:decay=0.2:feedback=0.3:cutoff=85:slope=0.5,acompressor=threshold=0.1:ratio=3:attack=15:release=250:makeup=1.6:knee=6:detection=rms,dynaudnorm=framelen=240:gausssize=13:maxgain=11:compress=7,alimiter=limit=0.97:attack=5:release=50`,
      "NIGHTCORE": `aresample=48000,asetrate=48000*1.25,aresample=48000:resampler=soxr:precision=28:cutoff=0.95,treble=gain=-2:frequency=9000:width_type=h:width=2000,acompressor=threshold=0.15:ratio=2.5:attack=5:release=150:makeup=1.3:knee=5:detection=peak,dynaudnorm=framelen=200:gausssize=9:maxgain=10,alimiter=limit=0.98:attack=3:release=40`,
      "MUFFLED": `firequalizer=gain_entry='entry(20,6);entry(100,5);entry(250,2);entry(500,0);entry(1000,-8);entry(2000,-16);entry(4000,-26);entry(8000,-36);entry(16000,-45)':delay=0.01,asubboost=dry=0.6:wet=0.4:boost=2:decay=0.2:feedback=0.25:cutoff=90:slope=0.5,acompressor=threshold=0.12:ratio=3.5:attack=10:release=200:makeup=2:knee=6:detection=rms,dynaudnorm=framelen=300:gausssize=21:maxgain=14,alimiter=limit=0.97:attack=4:release=60`,
      "MUFFLED_SLOWED": `aresample=48000,asetrate=48000*0.80,aresample=48000:resampler=soxr:precision=28:cutoff=0.97,firequalizer=gain_entry='entry(20,6);entry(100,5);entry(250,2);entry(500,0);entry(1000,-8);entry(2000,-16);entry(4000,-26);entry(8000,-36);entry(16000,-45)':delay=0.01,asubboost=dry=0.55:wet=0.45:boost=3:decay=0.2:feedback=0.3:cutoff=90:slope=0.5,acompressor=threshold=0.1:ratio=3.5:attack=12:release=220:makeup=1.8:knee=6:detection=rms,dynaudnorm=framelen=280:gausssize=19:maxgain=15:compress=8,alimiter=limit=0.97:attack=5:release=55`,
      "MUFFLED_SPEED": `aresample=48000,asetrate=48000*1.18,aresample=48000:resampler=soxr:precision=28:cutoff=0.95,firequalizer=gain_entry='entry(20,6);entry(100,5);entry(250,2);entry(500,0);entry(1000,-8);entry(2000,-16);entry(4000,-26);entry(8000,-36);entry(16000,-45)':delay=0.01,asubboost=dry=0.55:wet=0.45:boost=2.5:decay=0.2:feedback=0.28:cutoff=95:slope=0.5,acompressor=threshold=0.11:ratio=3.5:attack=8:release=180:makeup=1.9:knee=6:detection=rms,dynaudnorm=framelen=260:gausssize=17:maxgain=15:compress=8,alimiter=limit=0.97:attack=4:release=50`,
      "8D_AUDIO": `aecho=0.8:0.7:40|60:0.25|0.15,extrastereo=m=2.0:c=1,apulsator=mode=sine:timing=hz:hz=0.16:width=0.7,dynaudnorm=framelen=150:gausssize=11:maxgain=8,alimiter=limit=0.97:attack=5:release=50`,
      "LOFI": `vibrato=f=0.4:d=0.15,firequalizer=gain_entry='entry(20,2);entry(100,3);entry(1000,0);entry(4000,-4);entry(8000,-10);entry(14000,-18)',acrusher=bits=10:mix=0.35:samples=2:aa=1,asoftclip=type=tanh:oversample=8,acompressor=threshold=0.15:ratio=2.5:attack=12:release=180:makeup=1.4:knee=5,dynaudnorm=framelen=250:gausssize=13:maxgain=10,alimiter=limit=0.96:attack=5:release=60`,
      "BASS_BOOST": `asubboost=dry=0.5:wet=0.5:boost=4:decay=0.2:feedback=0.25:cutoff=110:slope=0.6,acompressor=threshold=0.08:ratio=4:attack=6:release=120:makeup=1.6:knee=4:detection=peak,bass=gain=3:frequency=80:width_type=o:width=1.2,acompressor=threshold=0.2:ratio=2:attack=20:release=200:makeup=1.2:detection=rms,dynaudnorm=framelen=200:gausssize=9:maxgain=10,alimiter=limit=0.98:attack=2:release=40`,
      "VINTAGE_RADIO": `highpass=frequency=280:poles=1,lowpass=frequency=3600:poles=1,equalizer=frequency=1200:width_type=o:width=1.2:gain=7,asoftclip=type=atan,acompressor=threshold=0.1:ratio=6:attack=5:release=80:makeup=2.2:knee=3:detection=rms,dynaudnorm=framelen=200:gausssize=11:maxgain=12,alimiter=limit=0.96:attack=3:release=40`,
      "REVERB_HALL": `aecho=0.85:0.9:20|40|60|85:0.35|0.28|0.2|0.14,aecho=0.7:0.6:150|230:0.22|0.15,highpass=frequency=110:poles=1,equalizer=frequency=3000:width_type=o:width=1.5:gain=-3,acompressor=threshold=0.15:ratio=2.2:attack=25:release=300:makeup=1.3:detection=rms,dynaudnorm=framelen=300:gausssize=15:maxgain=9,alimiter=limit=0.97:attack=6:release=60`,
      "ROBOTIC": `tremolo=f=45:d=0.55,aphaser=in_gain=0.7:out_gain=0.8:delay=2.5:decay=0.4:speed=0.8:type=t,equalizer=frequency=2500:width_type=o:width=1.5:gain=5,acompressor=threshold=0.12:ratio=4:attack=8:release=100:makeup=1.8:knee=5,dynaudnorm=framelen=200:gausssize=11:maxgain=10,alimiter=limit=0.97:attack=4:release=50`,
      "UNDERWATER": `lowpass=frequency=900:poles=2:width_type=q:width=2.2,vibrato=f=0.25:d=0.35,chorus=0.6:0.7:35:0.4:0.2:1.5,acompressor=threshold=0.13:ratio=3:attack=15:release=220:makeup=1.9:detection=rms,dynaudnorm=framelen=280:gausssize=17:maxgain=13,alimiter=limit=0.96:attack=5:release=55`,
      "STADIUM": `aecho=0.9:0.85:35|70|110|160|230:0.4|0.32|0.26|0.19|0.12,extrastereo=m=1.6:c=1,bass=gain=4:frequency=100:width_type=o:width=1.5,acompressor=threshold=0.09:ratio=3.5:attack=10:release=180:makeup=1.7:knee=5,equalizer=frequency=4500:width_type=o:width=1.4:gain=-2.5,dynaudnorm=framelen=300:gausssize=19:maxgain=11,alimiter=limit=0.98:attack=3:release=45`,
      "CLARITY_ENHANCE": `crystalizer=i=3.5:c=1,equalizer=frequency=3000:width_type=o:width=1.3:gain=4,equalizer=frequency=11000:width_type=h:width=4000:gain=3,acompressor=threshold=0.14:ratio=2.8:attack=8:release=150:makeup=1.5:knee=5:detection=rms,dynaudnorm=framelen=200:gausssize=9:maxgain=9,alimiter=limit=0.98:attack=3:release=40`
    };

    // Mapeamento de retrocompatibilidade
    const aliases = {
      "SLOWED_PERFECTION": "SLOWED",
      "8D_AUDIO_ULTRA": "8D_AUDIO",
      "8D": "8D_AUDIO",
      "UNDERWATER_PRO": "UNDERWATER",
      "LO_FI_RADIO": "LOFI",
      "SPEED_UP_PRO": "NIGHTCORE",
      "NIGHTCORE_CLASSIC": "NIGHTCORE",
      "BABY_VOICE": "NIGHTCORE",
      "BASS_BOOST_EXTREME": "BASS_BOOST",
      "CATHEDRAL_REVERB": "REVERB_HALL",
      "GLITCH_CYBERPUNK": "ROBOTIC"
    };

    const resolvedPreset = filters[preset] ? preset : (aliases[preset] || null);

    if (resolvedPreset && filters[resolvedPreset]) {
      return filters[resolvedPreset];
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

      let isFinished = false;

      inputStream.process?.on?.("error", (err) => {
        if (isFinished) return;
        isFinished = true;
        console.error(`[${jobId}] input source error:`, err.message);
        ff.kill();
        reject(err);
      });

      inputStream.stream?.on?.("error", (err) => {
        if (isFinished) return;
        isFinished = true;
        console.error(`[${jobId}] input stream error:`, err.message);
        ff.kill();
        reject(err);
      });

      ff.on("close", (code) => {
        if (isFinished) return;
        isFinished = true;
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

      // 3. Define a chave no R2 (estrutura: premium/<userId>/<jobId>.mp3)
      const safeUserFolder =
        typeof userId === "string" && /^[a-z0-9_-]+$/i.test(userId)
          ? userId
          : getUserIdentity("anonymous").storageKey;

      const tier = 'premium';

      const r2Key = `${tier}/${safeUserFolder}/${filename}`;
      console.log(`[R2] Upload para: ${r2Key}`);

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
   * Processa áudio e salva apenas localmente (sem R2)
   */
  async processAndSaveLocally(inputStream, jobId, preset, durationSec, title = 'audio') {
    let finalPath = null;
    try {
      const normalizedDuration =
        typeof durationSec === 'number' && Number.isFinite(durationSec)
          ? durationSec
          : parseFloat(durationSec) || 0;

      if (isDurationTooLong(normalizedDuration)) {
        throw new Error(buildDurationLimitMessage(normalizedDuration));
      }

      const storageDir = typeof this.storagePath === 'function' ? this.storagePath() : this.storagePath;

      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const filename = this.generateUniqueFilename(title, preset, storageDir);
      finalPath = path.join(storageDir, filename);

      const audioFilterStr = this.buildAudioFilter(preset, normalizedDuration);
      await this.processAudio(
        inputStream,
        finalPath,
        audioFilterStr,
        normalizedDuration,
        jobId
      );

      if (!fs.existsSync(finalPath)) {
        throw new Error('FFmpeg não gerou o arquivo de saída local');
      }

      return {
        publicUrl: finalPath, // Usado como out nos controllers
        localPath: finalPath,
        filename: filename
      };

    } catch (error) {
      if (finalPath && fs.existsSync(finalPath)) {
        fs.unlinkSync(finalPath);
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

  /**
   * Baixa a miniatura do YouTube para um arquivo local
   */
  async downloadThumbnail(url, destPath) {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(destPath);
      https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });
  }

  /**
   * Gera um vídeo vertical estilo TikTok usando a capa e o áudio
   */
  async generateTikTokVideo(job, jobQueueService) {
    return new Promise(async (resolve, reject) => {
      let thumbnailPath = null;
      let finalVideoPath = null;
      try {
        const audioPath = job.out; // Local file
        if (!audioPath || !fs.existsSync(audioPath)) {
          throw new Error("Áudio não encontrado para renderização.");
        }

        const storageDir = typeof this.storagePath === 'function' ? this.storagePath() : this.storagePath;
        const videoFilename = job.filename.replace('.mp3', '_tiktok.mp4');
        finalVideoPath = path.join(storageDir, videoFilename);
        thumbnailPath = path.join(storageDir, `${job.id}_thumb.jpg`);

        if (job.metadata.thumbnail) {
          await this.downloadThumbnail(job.metadata.thumbnail, thumbnailPath);
        } else {
          throw new Error("Nenhuma capa disponível para gerar o vídeo.");
        }

        const title = job.metadata.title || "Remix";
        const presetName = job.metadata.preset || "CUSTOM";
        const fontPath = path.resolve('public/fonts/Roboto-Bold.ttf');
        
        // Escape characters for drawtext
        const safeTitle = title.replace(/'/g, '').replace(/:/g, '\\:');
        const safeFontPath = fontPath.replace(/:/g, '\\\\:');

        const filterComplex = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=25,eq=brightness=-0.1:saturation=1.15[bg];[0:v]scale=800:800:force_original_aspect_ratio=increase,crop=800:800[art];[bg][art]overlay=(W-w)/2:(H-h)/2-100[base];[1:a]showwaves=s=900x180:mode=cline:colors=0xF5C77E|0xE8A567:rate=30,format=yuva420p,colorkey=0x000000:0.2:0.05[wave];[base][wave]overlay=(W-w)/2:H-260[withwave];[withwave]drawtext=fontfile='${safeFontPath}':text='${safeTitle}':fontsize=54:fontcolor=white:x=(w-text_w)/2:y=140,drawtext=fontfile='${safeFontPath}':text='${presetName}':fontsize=34:fontcolor=0xE8A567:x=(w-text_w)/2:y=210[final]`;

        const ffArgs = [
          "-loop", "1",
          "-i", thumbnailPath,
          "-i", audioPath,
          "-filter_complex", filterComplex,
          "-map", "[final]",
          "-map", "1:a",
          "-c:v", "libx264",
          "-preset", "veryfast", // veryfast is better for server CPU, tradeoff some compression
          "-crf", "23",
          "-pix_fmt", "yuv420p",
          "-r", "30",
          "-c:a", "aac",
          "-b:a", "192k",
          "-shortest",
          "-movflags", "+faststart",
          "-y",
          finalVideoPath
        ];

        const ff = spawn("ffmpeg", ffArgs);

        let durationMs = (job.metadata.duration || 0) * 1000;
        let fullStderr = "";
        
        ff.stderr.on("data", (chunk) => {
          const s = String(chunk);
          fullStderr += s;
          // try parse time=00:00:03.45 to update progress
          const timeMatch = s.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
          if (timeMatch && durationMs > 0) {
            const h = parseInt(timeMatch[1], 10);
            const m = parseInt(timeMatch[2], 10);
            const sec = parseFloat(timeMatch[3]);
            const currentMs = (h * 3600 + m * 60 + sec) * 1000;
            const progress = Math.min(100, Math.round((currentMs / durationMs) * 100));
            if (job.videoProgress !== progress) {
              job.videoProgress = progress;
            }
          }
        });

        ff.on("close", (code) => {
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
          if (code === 0) {
            job.videoOut = finalVideoPath;
            job.videoStatus = "DONE";
            job.videoProgress = 100;
            resolve(finalVideoPath);
          } else {
            console.error(`FFmpeg video error output:\n${fullStderr}`);
            job.videoStatus = "ERROR";
            job.videoError = "Erro ao renderizar vídeo (Exit " + code + ")";
            reject(new Error(job.videoError));
          }
        });

      } catch (err) {
        if (thumbnailPath && fs.existsSync(thumbnailPath)) fs.unlinkSync(thumbnailPath);
        job.videoStatus = "ERROR";
        job.videoError = err.message;
        reject(err);
      }
    });
  }
}
