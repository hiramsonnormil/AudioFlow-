/**
 * Service: YouTube
 * Gerencia a extração de metadados e áudio do YouTube
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Auto-detect cookies.txt at project root
const PROJECT_ROOT = path.resolve(__dirname, "../../");
const DEFAULT_COOKIES_PATH = path.join(PROJECT_ROOT, "cookies.txt");

export class YouTubeService {
  constructor(cookiesPath = null) {
    // Use explicitly provided path, or auto-detect cookies.txt at project root
    this.cookiesPath =
      cookiesPath ||
      (fs.existsSync(DEFAULT_COOKIES_PATH) ? DEFAULT_COOKIES_PATH : null);

    if (this.cookiesPath) {
      console.log(`[YouTubeService] Using cookies: ${this.cookiesPath}`);
    } else {
      console.warn(
        `[YouTubeService] No cookies.txt found. YouTube may block requests. ` +
          `Place a cookies.txt at: ${DEFAULT_COOKIES_PATH}`
      );
    }
  }

  /**
   * Constrói os argumentos de cookies para yt-dlp
   */
  _cookieArgs() {
    if (this.cookiesPath && fs.existsSync(this.cookiesPath)) {
      return ["--cookies", this.cookiesPath];
    }
    return [];
  }

  /**
   * Valida se uma URL é do YouTube
   */
  isYouTubeUrl(url) {
    try {
      const { hostname } = new URL(url);
      return hostname.includes("youtube.com") || hostname.includes("youtu.be");
    } catch (e) {
      return false;
    }
  }

  /**
   * Extrai o ID do vídeo da URL
   */
  extractVideoId(url) {
    try {
      const urlObj = new URL(url);

      if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v");
      }

      if (urlObj.hostname.includes("youtu.be")) {
        return urlObj.pathname.slice(1).split("?")[0];
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /**
   * Obtém metadados do vídeo do YouTube
   */
  getMetadata(url, jobId) {
    return new Promise((resolve, reject) => {
      const args = [
        ...this._cookieArgs(),
        "--extractor-args",
        "youtube:player_client=android",
        "-j",
        "--no-warnings",
        "--socket-timeout",
        "30",
        url,
      ];

      const ydl = spawn("yt-dlp", args);
      let output = "";
      let stderrOutput = "";

      ydl.stdout.on("data", (d) => {
        output += d;
      });

      ydl.stderr.on("data", (d) => {
        stderrOutput += String(d);
        const line = String(d).slice(0, 200);
        if (!line.includes("Downloading") && !line.includes("fragment")) {
          console.error(`[${jobId}] yt-dlp: ${line.trim()}`);
        }
      });

      ydl.on("close", (code) => {
        if (code !== 0 || !output.trim()) {
          // Detect bot/auth errors and give a clear message
          const isBotError =
            stderrOutput.includes("Sign in to confirm") ||
            stderrOutput.includes("bot");
          const errMsg = isBotError
            ? `YouTube requer autenticação. Adicione cookies.txt em: ${DEFAULT_COOKIES_PATH} (ver README)`
            : `yt-dlp falhou (código ${code})`;
          return reject(new Error(errMsg));
        }

        try {
          const data = JSON.parse(output);
          const title = data.title || `Audio ${jobId}`;
          const duration = parseFloat(data.duration) || 0;
          const videoId = data.id || this.extractVideoId(url);
          const thumbnail = videoId
            ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
            : null;

          resolve({ title, duration, thumbnail, videoId });
        } catch (e) {
          console.error(`[${jobId}] Error parsing metadata:`, e.message);
          resolve({ title: `Audio ${jobId}`, duration: 0, thumbnail: null });
        }
      });

      ydl.on("error", (err) => {
        reject(new Error(`yt-dlp spawn error: ${err.message}`));
      });
    });
  }

  /**
   * Obtém stream de áudio do YouTube
   * Retorna um objeto { stream, process, stderrLog }
   * Se o yt-dlp falhar, 'stream' emite um evento 'error' para o consumidor tratar
   */
  getAudioStream(url, jobId) {
    const baseArgs = [
      ...this._cookieArgs(),
      "--extractor-args",
      "youtube:player_client=android",
      "-f",
      "ba/b",
      "-o",
      "-",
      "--no-warnings",
      "--socket-timeout",
      "30",
      url,
    ];

    const dl = spawn("yt-dlp", baseArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderrLog = "";
    let didReceiveData = false;

    dl.stdout.once("data", () => {
      didReceiveData = true;
    });

    dl.stderr.on("data", (d) => {
      stderrLog += String(d);
    });

    dl.on("error", (err) => {
      console.error(`[${jobId}] yt-dlp spawn error:`, err.message);
      dl.stdout.emit("error", err);
    });

    dl.on("close", (code) => {
      if (code !== 0) {
        const isBotError =
          stderrLog.includes("Sign in to confirm") ||
          stderrLog.includes("bot");
        const errMsg = isBotError
          ? `YouTube bloqueou o download. Adicione cookies.txt em: ${DEFAULT_COOKIES_PATH}`
          : `yt-dlp exit code ${code}: ${stderrLog.slice(-300)}`;
        console.error(`[${jobId}] ${errMsg}`);
        // Emit error on stdout so ffmpeg pipe gets destroyed
        if (!didReceiveData) {
          dl.stdout.emit("error", new Error(errMsg));
        }
      }
    });

    return {
      stream: dl.stdout,
      process: dl,
      stderrLog: () => stderrLog,
    };
  }
}

// Singleton instance
export const youtubeService = new YouTubeService();
