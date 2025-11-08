/**
 * Service: YouTube
 * Gerencia a extração de metadados e áudio do YouTube
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

export class YouTubeService {
  constructor(cookiesPath = null) {
    this.cookiesPath = cookiesPath;
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
    return new Promise((resolve) => {
      const args = ["-j", "--no-warnings", "--socket-timeout", "30"];

      if (this.cookiesPath && fs.existsSync(this.cookiesPath)) {
        args.unshift("--cookies", this.cookiesPath);
      }

      args.push(url);

      const ydl = spawn("yt-dlp", args);
      let output = "";

      ydl.stdout.on("data", (d) => {
        output += d;
      });

      ydl.stderr.on("data", (d) => {
        console.error(
          `[${jobId}] yt-dlp metadata error: ${String(d).slice(0, 100)}`
        );
      });

      ydl.on("close", () => {
        try {
          const data = JSON.parse(output);
          const title = data.title || `Audio ${jobId}`;
          const duration = parseFloat(data.duration) || 0;
          const videoId = data.id || this.extractVideoId(url);
          const thumbnail = videoId
            ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
            : null;

          console.log(
            `[${jobId}] Metadata: "${title}" (${duration.toFixed(2)}s)`
          );

          resolve({ title, duration, thumbnail, videoId });
        } catch (e) {
          console.error(`[${jobId}] Error parsing metadata:`, e.message);
          resolve({ title: `Audio ${jobId}`, duration: 0, thumbnail: null });
        }
      });
    });
  }

  /**
   * Obtém stream de áudio do YouTube
   */
  getAudioStream(url, jobId) {
    const baseArgs = [
      "-f",
      "bestaudio",
      "-x",
      "--audio-format",
      "m4a",
      "-o",
      "-",
      "--no-warnings",
      "--socket-timeout",
      "30",
    ];

    if (this.cookiesPath && fs.existsSync(this.cookiesPath)) {
      baseArgs.push("--cookies", this.cookiesPath);
      console.log(`[${jobId}] Using cookies file`);
    }

    baseArgs.push(url);

    const dl = spawn("yt-dlp", baseArgs, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderrLog = "";

    dl.stderr.on("data", (d) => {
      stderrLog += String(d);
    });

    dl.on("error", (err) => {
      console.error(`[${jobId}] yt-dlp spawn error:`, err.message);
    });

    dl.on("close", (code) => {
      if (code !== 0 && stderrLog) {
        console.error(
          `[${jobId}] yt-dlp exit code ${code}: ${stderrLog.slice(-500)}`
        );
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
