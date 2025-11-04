import express from "express";
import { nanoid } from "nanoid";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const STORAGE_IN = path.join(__dirname, "storage", "in");
const STORAGE_OUT = path.join(__dirname, "storage", "out");
const STORAGE_META = path.join(__dirname, "storage", "meta");
fs.mkdirSync(STORAGE_IN, { recursive: true });
fs.mkdirSync(STORAGE_OUT, { recursive: true });
fs.mkdirSync(STORAGE_META, { recursive: true });

const PORT = process.env.PORT || 8080;
const JOBS = new Map();
const PENDING_QUEUE = []; // Fila de jobs aguardando processamento
const MAX_CONCURRENT_JOBS = 10; // Máximo de jobs simultâneos
let ACTIVE_JOBS = 0; // Contador de jobs ativos

function isYouTubeUrl(u) {
  try {
    const { hostname } = new URL(u);
    return hostname.includes("youtube.com") || hostname.includes("youtu.be");
  } catch (e) {
    return false;
  }
}

function makeJob(id) {
  return {
    id,
    status: "PENDING",
    progress: 0,
    in: null,
    out: null,
    error: null,
    metadata: { title: null, thumbnail: null },
    filename: null, // Nome do arquivo de saída
  };
}

function generateUniqueFilename(baseTitle, preset, outputDir) {
  // Sanitizar título para usar como nome de arquivo
  let sanitized = baseTitle
    .replace(/[^\w\s-]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "_") // Espaços para underscore
    .substring(0, 50) // Limita tamanho
    .toLowerCase();

  if (!sanitized || sanitized.trim() === "") {
    sanitized = "audio";
  }

  const baseName = `${sanitized}_${preset}`;
  let filename = `${baseName}.mp3`;
  let counter = 1;

  // Verificar se arquivo já existe
  while (fs.existsSync(path.join(outputDir, filename))) {
    filename = `${baseName}_${counter}.mp3`;
    counter++;
  }

  return filename;
}

// Processar fila de jobs
function processQueue() {
  while (ACTIVE_JOBS < MAX_CONCURRENT_JOBS && PENDING_QUEUE.length > 0) {
    const jobId = PENDING_QUEUE.shift();
    const job = JOBS.get(jobId);

    if (!job || job.status !== "PENDING") continue;

    ACTIVE_JOBS++;
    processJob(jobId)
      .catch((err) => {
        console.error(`[${jobId}] Unexpected error:`, err);
        job.status = "ERROR";
        job.error = "Erro inesperado: " + String(err.message || err);
      })
      .finally(() => {
        ACTIVE_JOBS--;
        // Processar próximo job na fila
        processQueue();
      });
  }
}

// Executar job específico
async function processJob(id) {
  const job = JOBS.get(id);
  if (!job) return;

  try {
    const url = job.in; // URL guardada em job.in
    const preset = job.metadata.preset; // Preset guardado em metadata

    job.status = "DOWNLOADING";
    job.progress = 0;

    // Step 1: Extract metadata from YouTube URL (no download yet)
    console.log(`[${id}] Extracting metadata from URL...`);
    job.status = "EXTRACTING";
    const metadata = await getYouTubeMetadata(url, id);
    job.metadata = { ...job.metadata, ...metadata };
    const duration =
      typeof metadata.duration === "number"
        ? metadata.duration
        : parseFloat(metadata.duration) || 0;
    console.log(
      `[${job.id}] Title: ${metadata.title}, Duration: ${duration.toFixed(2)}s`
    );
    job.progress = 10; // 10% after metadata extraction

    // Step 2: Generate unique output filename
    const filename = generateUniqueFilename(
      metadata.title,
      preset,
      STORAGE_OUT
    );
    const outPath = path.join(STORAGE_OUT, filename);
    job.out = outPath;
    job.filename = filename;

    console.log(`[${job.id}] ==========================================`);
    console.log(`[${job.id}] Output filename: ${filename}`);
    console.log(`[${job.id}] Output full path: ${outPath}`);
    console.log(`[${job.id}] Job object ID: ${job.id}`);
    console.log(`[${job.id}] ==========================================`);

    const audioFilterStr = buildAudioFilter(preset, duration);
    console.log(
      `[${job.id}] Audio filter: ${audioFilterStr.substring(0, 80)}...`
    );

    // Step 3: Stream processing - pipe yt-dlp directly to FFmpeg
    job.status = "PROCESSING";
    job.progress = 15; // Start processing at 15%

    const durationMs = Math.round(duration * 1000);

    await new Promise((resolve, reject) => {
      // Get audio stream from YouTube
      const audioSource = getAudioStream(url, id);

      // Create FFmpeg process reading from stdin
      const ffArgs = [
        "-i",
        "-", // Read from stdin
        "-af",
        audioFilterStr,
        "-c:a",
        "libmp3lame",
        "-b:a",
        "192k",
        "-progress",
        "pipe:1",
        "-y",
        outPath,
      ];

      const ff = spawn("ffmpeg", ffArgs);
      let ffStderr = "";

      // Pipe yt-dlp output directly to FFmpeg input
      audioSource.stream.pipe(ff.stdin);

      ff.stdout.on("data", (chunk) => {
        const s = String(chunk);
        const m = s.match(/out_time_ms=(\d+)/);
        if (m && durationMs > 0) {
          const outMs = parseInt(m[1], 10);
          // Progresso de 15% a 95% durante o processamento FFmpeg
          const percent = Math.min(
            95,
            15 + Math.round((outMs / durationMs) * 80)
          );
          job.progress = percent;
        }
      });

      ff.stderr.on("data", (d) => {
        ffStderr += String(d);
      });

      ff.on("error", (err) => {
        console.error(`[${job.id}] ffmpeg spawn error:`, err.message);
        audioSource.process.kill();
        reject(err);
      });

      audioSource.process.on("error", (err) => {
        console.error(`[${job.id}] yt-dlp error:`, err.message);
        ff.kill();
        reject(err);
      });

      ff.on("close", (code) => {
        if (code === 0) {
          console.log(`[${job.id}] ffmpeg completed`);
          console.log(`[${job.id}] ==========================================`);
          console.log(`[${job.id}] FINAL FILE INFO:`);
          console.log(`[${job.id}] Job ID: ${job.id}`);
          console.log(`[${job.id}] Filename: ${job.filename}`);
          console.log(`[${job.id}] Full path: ${job.out}`);
          console.log(`[${job.id}] File exists: ${fs.existsSync(job.out)}`);
          if (fs.existsSync(job.out)) {
            const fileSize = fs.statSync(job.out).size;
            console.log(`[${job.id}] File size: ${fileSize} bytes`);
          }
          console.log(`[${job.id}] ==========================================`);
          job.progress = 95;
          resolve();
        } else {
          console.error(
            `[${job.id}] ffmpeg exit code ${code}:`,
            ffStderr.slice(-500)
          );
          reject(new Error(`ffmpeg failed with code ${code}`));
        }
      });
    });

    job.progress = 100;
    job.status = "DONE";
    console.log(`[${job.id}] Job completed successfully`);
  } catch (err) {
    job.status = "ERROR";
    job.error = String(err.message || err);
    job.progress = job.progress || 0;
    console.error(`[${job.id}] Error:`, job.error);
  }
}

// Stream audio from YouTube directly to FFmpeg without saving intermediate file
function getAudioStream(url, jobId) {
  const baseArgs = [
    "-f",
    "bestaudio",
    "-x",
    "--audio-format",
    "m4a",
    "-o",
    "-", // Output to stdout for piping
    "--no-warnings",
    "--socket-timeout",
    "30",
  ];

  // Check if cookies file exists
  const cookiesPath = path.join(__dirname, "cookies.txt");
  if (fs.existsSync(cookiesPath)) {
    baseArgs.push("--cookies", cookiesPath);
    console.log(`[${jobId}] Using cookies file`);
  }

  // Add URL at the end
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

  // Error handling is deferred to the pipe consumer
  dl.on("close", (code) => {
    if (code !== 0 && stderrLog) {
      console.error(
        `[${jobId}] yt-dlp exit code ${code}: ${stderrLog.slice(-500)}`
      );
    }
  });

  // Return object with stream and error handling
  return {
    stream: dl.stdout,
    process: dl,
    stderrLog: () => stderrLog,
  };
}

// Build filter string for audio with advanced presets
function buildAudioFilter(preset, durationSec) {
  const fadeDuration = 10; // seconds for fade in/out
  const finalDurationSec = durationSec / 0.1; // Worst case for ULTRA_SLOWED
  const fadeOutStart = Math.max(0, finalDurationSec - fadeDuration);

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
    return [`rubberband=tempo=1.35:pitch=1.35`, `loudnorm=I=-14:TP=-1.0`].join(
      ","
    );
  }

  if (preset === "8D") {
    // Espacial: apulsator 0.2Hz (pan lento, width=0.5 seguro), aecho reverb 50ms, alimiter anti-clipping, loudnorm final
    // ⚠️ Movimento 0.2Hz pode causar desorientação em headphones prolongado — casuístico <5min recomendado
    return [
      `aecho=0.5:0.45:50:0.25`,
      `apulsator=hz=0.2:width=0.5`,
      `alimiter=a=0.5`,
      `loudnorm=I=-14:TP=-1.0`,
    ].join(",");
  }

  return "loudnorm=I=-14:TP=-1.0";
}

// Extract video ID from YouTube URL
function extractYouTubeVideoId(url) {
  try {
    const urlObj = new URL(url);

    // youtube.com/watch?v=ID
    if (urlObj.hostname.includes("youtube.com")) {
      return urlObj.searchParams.get("v");
    }

    // youtu.be/ID
    if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1).split("?")[0];
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Extract metadata from YouTube URL using yt-dlp
async function getYouTubeMetadata(url, jobId) {
  return new Promise((resolve) => {
    const args = ["-j", "--no-warnings", "--socket-timeout", "30", url];

    // Check if cookies file exists
    const cookiesPath = path.join(__dirname, "cookies.txt");
    if (fs.existsSync(cookiesPath)) {
      args.unshift("--cookies", cookiesPath);
    }

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

        // Extract video ID and construct thumbnail URL
        const videoId = data.id || extractYouTubeVideoId(url);
        const thumbnail = videoId
          ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
          : null;

        console.log(
          `[${jobId}] Metadata extracted: "${title}" (${duration.toFixed(
            2
          )}s), video ID: ${videoId}, thumbnail: ${thumbnail ? "✓" : "✗"}`
        );
        resolve({ title, duration, thumbnail, videoId });
      } catch (e) {
        console.error(`[${jobId}] Error parsing yt-dlp metadata:`, e.message);
        resolve({ title: `Audio ${jobId}`, duration: 0, thumbnail: null });
      }
    });
  });
}

// Extract metadata from audio stream (fallback if yt-dlp fails)
async function extractMetadataFromStream(audioPath, jobId) {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration:format_tags=title",
      "-of",
      "json",
      audioPath,
    ]);
    let output = "";
    ffprobe.stdout.on("data", (d) => {
      output += d;
    });
    ffprobe.on("close", () => {
      try {
        const data = JSON.parse(output);
        const title = data.format?.tags?.title || `Audio ${jobId}`;
        const duration = parseFloat(data.format?.duration) || 0;
        resolve({ title, duration });
      } catch (e) {
        console.error(`[${jobId}] Error parsing metadata:`, e.message);
        resolve({ title: `Audio ${jobId}`, duration: 0 });
      }
    });
  });
}

// POST /process -> start job
app.post("/process", (req, res) => {
  const { url, preset } = req.body || {};
  if (!url || !preset)
    return res.status(400).json({ error: "missing url or preset" });
  if (!isYouTubeUrl(url))
    return res.status(400).json({ error: "url must be YouTube" });
  const validPresets = [
    "SLOWED",
    "SPEED_125",
    "ULTRA_SLOWED",
    "MUFFLED_SLOWED",
    "MUFFLED_SPEED",
    "DAYCORE",
    "NIGHTCORE",
    "8D",
  ];
  if (!validPresets.includes(preset))
    return res.status(400).json({ error: "invalid preset" });

  const id = nanoid(10);
  const job = makeJob(id);
  job.in = url; // Guardar URL para processamento posterior
  job.metadata.preset = preset; // Guardar preset para processamento posterior
  JOBS.set(id, job);
  PENDING_QUEUE.push(id); // Adicionar à fila

  console.log(
    `[${id}] New job queued: ${preset} from ${url} (Queue size: ${PENDING_QUEUE.length})`
  );

  // Tentar processar a fila imediatamente (não esperar resposta)
  processQueue();

  // Retornar imediatamente sem aguardar conclusão
  res.json({ id });
});

app.get("/status/:id", (req, res) => {
  const id = req.params.id;
  const job = JOBS.get(id);
  if (!job) return res.status(404).json({ error: "not found" });

  const result = {
    id: job.id,
    status: job.status,
    progress: job.progress,
    title: job.metadata.title || null,
    filename: job.filename || null,
    filePath: job.out || null, // DEBUG: mostrar caminho real
    thumbnail: job.metadata.thumbnail || null, // YouTube thumbnail URL
    videoId: job.metadata.videoId || null, // Video ID for thumbnail
  };

  if (job.status === "DONE") {
    result.output = `/file/${job.id}`;
    // Debug: verificar se arquivo existe
    if (fs.existsSync(job.out)) {
      result.fileExists = true;
      result.fileSize = fs.statSync(job.out).size;
    } else {
      result.fileExists = false;
      console.error(`[${job.id}] File not found at: ${job.out}`);
    }
  }
  if (job.error) {
    result.error = job.error;
  }
  // Adicionar headers para evitar cache
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(result);
});

// GET /queue-stats -> estatísticas da fila
app.get("/queue-stats", (req, res) => {
  let total = 0;
  let pending = 0;
  let processing = 0;
  let done = 0;
  let error = 0;

  for (const job of JOBS.values()) {
    total++;
    if (job.status === "PENDING") pending++;
    else if (
      job.status === "DOWNLOADING" ||
      job.status === "EXTRACTING" ||
      job.status === "PROCESSING"
    )
      processing++;
    else if (job.status === "DONE") done++;
    else if (job.status === "ERROR") error++;
  }

  res.json({
    total,
    pending,
    processing,
    done,
    error,
    activeJobs: ACTIVE_JOBS,
    maxConcurrent: MAX_CONCURRENT_JOBS,
    queueLength: PENDING_QUEUE.length,
  });
});

app.get("/file/:id", (req, res) => {
  const id = req.params.id;
  const job = JOBS.get(id);

  console.log(`\n[DEBUG] /file/${id} - Fetching file`);
  console.log(`[DEBUG] Job found: ${!!job}`);

  if (!job) {
    console.error(`[DEBUG] Job ${id} not found in JOBS map`);
    console.error(
      `[DEBUG] Available jobs: ${Array.from(JOBS.keys()).join(", ")}`
    );
    return res.status(404).send("not found");
  }

  console.log(`[DEBUG] Job status: ${job.status}`);
  console.log(`[DEBUG] Job out: ${job.out}`);
  console.log(`[DEBUG] Job filename: ${job.filename}`);

  if (job.status !== "DONE") return res.status(400).send("not ready");

  const filePath = job.out;

  // Verificar se arquivo existe
  if (!fs.existsSync(filePath)) {
    console.error(`[DEBUG] File not found at: ${filePath}`);
    console.error(`[DEBUG] Files in STORAGE_OUT:`);
    try {
      const files = fs.readdirSync(STORAGE_OUT);
      console.error(files);
    } catch (e) {
      console.error("Error reading STORAGE_OUT:", e.message);
    }
    return res.status(404).send(`file not found: ${filePath}`);
  }

  const fileSize = fs.statSync(filePath).size;
  console.log(`[DEBUG] Serving file: ${filePath} (${fileSize} bytes)`);

  // Usar nome do arquivo real para download
  const downloadName = job.filename || path.basename(filePath);

  // Headers para evitar cache e servir como arquivo
  res.set("Cache-Control", "no-cache, no-store, must-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Content-Type", "audio/mpeg");
  res.set("Content-Disposition", `inline; filename="${downloadName}"`);
  res.set("Content-Length", fileSize);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`[DEBUG] Error sending file: ${err.message}`);
    } else {
      console.log(`[DEBUG] File sent successfully`);
    }
  });
});

// Thumbnail endpoint removed - using YouTube thumbnail URL directly via /status response

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
