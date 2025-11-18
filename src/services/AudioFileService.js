/**
 * Service: Audio File Service
 * Gerencia upload e leitura de arquivos de áudio locais
 */

import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export class AudioFileService {
  constructor(storagePath) {
    this.storagePath = storagePath;
  }

  /**
   * Obtém a duração de um arquivo de áudio em segundos
   */
  async getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn("ffprobe", [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1:noescapes=1",
        filePath,
      ]);

      let output = "";
      ffprobe.stdout.on("data", (data) => {
        output += data.toString();
      });

      ffprobe.on("close", (code) => {
        if (code === 0) {
          const duration = parseFloat(output.trim()) || 0;
          resolve(duration);
        } else {
          reject(new Error("Failed to get audio duration"));
        }
      });

      ffprobe.on("error", (err) => {
        reject(err);
      });
    });
  }

  /**
   * Processa áudio de arquivo local
   */
  processAudioFile(inputPath, outputPath, audioFilterStr, jobId) {
    return new Promise((resolve, reject) => {
      const ffArgs = [
        "-i",
        inputPath,
        "-af",
        audioFilterStr,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        "-y",
        outputPath,
      ];

      const ff = spawn("ffmpeg", ffArgs);
      let ffStderr = "";

      ff.stderr.on("data", (d) => {
        ffStderr += String(d);
      });

      ff.on("error", (err) => {
        console.error(`[${jobId}] ffmpeg spawn error:`, err.message);
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
    });
  }

  /**
   * Gera nome de arquivo único para output
   */
  generateUniqueFilename(originalName, preset, outputDir) {
    const baseName = path.parse(originalName).name || "audio";
    const timestamp = Date.now();
    const filename = `${baseName}_${preset}_${timestamp}.mp3`;

    let finalPath = path.join(outputDir, filename);
    let counter = 1;

    while (fs.existsSync(finalPath)) {
      const newFilename = `${baseName}_${preset}_${timestamp}_${counter}.mp3`;
      finalPath = path.join(outputDir, newFilename);
      counter++;
    }

    return path.basename(finalPath);
  }

  /**
   * Valida se arquivo é áudio suportado
   */
  isSupportedAudioFile(filename) {
    const supportedExtensions = [
      ".mp3",
      ".wav",
      ".m4a",
      ".aac",
      ".flac",
      ".ogg",
      ".wma",
    ];
    const ext = path.extname(filename).toLowerCase();
    return supportedExtensions.includes(ext);
  }
}
