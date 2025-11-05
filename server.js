import express from "express";
import { nanoid } from "nanoid";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import Joi from "joi";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";

dotenv.config();

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// 🔐 SECURITY VALIDATION
// ============================================
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error(
      "❌ ERRO: JWT_SECRET deve ter no mínimo 32 caracteres em produção!"
    );
    process.exit(1);
  }
  if (!process.env.DB_PASSWORD) {
    console.error("❌ ERRO: DB_PASSWORD é obrigatório em produção!");
    process.exit(1);
  }
  if (!process.env.DO_SPACES_SECRET) {
    console.error("❌ ERRO: DO_SPACES_SECRET é obrigatório em produção!");
    process.exit(1);
  }
}

// ============================================
// DATABASE SETUP - PostgreSQL
// ============================================
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: true }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================
// SPACES SETUP - DigitalOcean S3 Compatible Storage
// ============================================
const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION || "nyc3",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  forcePathStyle: true,
});

// ============================================
// EXPRESS APP SETUP - com SECURITY HEADERS
// ============================================
const app = express();

// 🔐 Security Middleware
app.use(helmet()); // Security headers
app.use(mongoSanitize()); // Data sanitization
app.use(express.json({ limit: "10mb" })); // Limite de payload
app.use(express.static(path.join(__dirname, "public")));

// 🔐 CORS Configurado
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || "http://localhost:3000"
).split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// 🔐 Rate Limiting - Auth Endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas
  message: "Muitas tentativas de login, tente novamente em 15 minutos",
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔐 Rate Limiting - Process Endpoint
const processLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // máximo 10 jobs por hora
  message: "Limite de jobs atingido, tente novamente em 1 hora",
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔐 Rate Limiting - General
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // máximo 100 requisições
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(generalLimiter);

const STORAGE_IN = path.join(__dirname, "storage", "in");
const STORAGE_OUT = path.join(__dirname, "storage", "out");
fs.mkdirSync(STORAGE_IN, { recursive: true });
fs.mkdirSync(STORAGE_OUT, { recursive: true });

const PORT = process.env.PORT || 8080;
const JOBS = new Map();
const PENDING_QUEUE = [];
const MAX_CONCURRENT_JOBS = 10;
let ACTIVE_JOBS = 0;
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";
const BCRYPT_ROUNDS = 10;

// ============================================
// 🔐 VALIDATION SCHEMAS
// ============================================
const registerSchema = Joi.object({
  email: Joi.string().email().required().max(255),
  password: Joi.string()
    .min(8)
    .max(100)
    .required()
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[!@#$%^&*]/),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const processSchema = Joi.object({
  url: Joi.string().uri().required(),
  preset: Joi.string()
    .valid(
      "SLOWED",
      "SPEED_125",
      "ULTRA_SLOWED",
      "MUFFLED_SLOWED",
      "MUFFLED_SPEED",
      "DAYCORE",
      "NIGHTCORE",
      "8D"
    )
    .required(),
});

// ============================================
// DATABASE INITIALIZATION
// ============================================
async function initializeDatabase() {
  try {
    // Tabela de usuários
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        failed_login_attempts INT DEFAULT 0,
        locked_until TIMESTAMP
      )
    `);

    // Tabela de jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id VARCHAR(20) PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'PENDING',
        progress INTEGER DEFAULT 0,
        preset VARCHAR(50),
        title VARCHAR(255),
        filename VARCHAR(255),
        file_url VARCHAR(500),
        thumbnail VARCHAR(500),
        video_id VARCHAR(50),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
        CONSTRAINT check_status CHECK (status IN ('PENDING', 'DOWNLOADING', 'EXTRACTING', 'PROCESSING', 'DONE', 'ERROR')),
        CONSTRAINT check_progress CHECK (progress >= 0 AND progress <= 100)
      )
    `);

    // Índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
      CREATE INDEX IF NOT EXISTS idx_jobs_expires_at ON jobs(expires_at);
      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    // Função para deletar jobs expirados
    await pool.query(`
      CREATE OR REPLACE FUNCTION delete_expired_jobs()
      RETURNS void AS $$
      BEGIN
        DELETE FROM jobs WHERE expires_at < CURRENT_TIMESTAMP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log("✅ Database initialized successfully");
  } catch (err) {
    console.error("❌ Database initialization error:", err.message);
  }
}

initializeDatabase();

// ============================================
// 🔐 AUTHENTICATION MIDDLEWARE
// ============================================
async function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token obrigatório" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado" });
    }
    res.status(401).json({ error: "Token inválido" });
  }
}

// ============================================
// 🔐 ERROR HANDLING MIDDLEWARE
// ============================================
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);

  if (err.message === "CORS not allowed") {
    return res.status(403).json({ error: "CORS não permitido" });
  }

  if (err instanceof Joi.ValidationError) {
    return res.status(400).json({ error: err.details[0].message });
  }

  res.status(500).json({ error: "Erro interno do servidor" });
});

// ============================================
// AUTH ENDPOINTS
// ============================================

// POST /auth/register
app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    // 🔐 Validação
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // 🔐 Verificar email duplicado
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: "Email já registrado" });
    }

    // 🔐 Hash da senha com bcrypt
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Inserir usuário
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, hashedPassword]
    );

    const user = result.rows[0];

    // 🔐 Gerar JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.status(201).json({ token, userId: user.id, email: user.email });
  } catch (err) {
    console.error("[REGISTER ERROR]", err.message);
    res.status(500).json({ error: "Erro ao registrar" });
  }
});

// POST /auth/login
app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    // 🔐 Validação
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // 🔐 Buscar usuário
    const result = await pool.query(
      "SELECT id, email, password_hash, locked_until, failed_login_attempts FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      // 🔐 Não revelar se email existe
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    const user = result.rows[0];

    // 🔐 Verificar se conta está locked (brute force protection)
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(429).json({
        error: "Conta temporariamente bloqueada. Tente novamente depois",
      });
    }

    // 🔐 Comparar senha com bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // 🔐 Incrementar tentativas falhadas
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockedUntil = null;

      if (failedAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos bloqueado
      }

      await pool.query(
        "UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3",
        [failedAttempts, lockedUntil, user.id]
      );

      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // 🔐 Reset tentativas falhadas e atualizar último login
    await pool.query(
      "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1",
      [user.id]
    );

    // 🔐 Gerar JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });

    res.json({ token, userId: user.id, email: user.email });
  } catch (err) {
    console.error("[LOGIN ERROR]", err.message);
    res.status(500).json({ error: "Erro no login" });
  }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

function isYouTubeUrl(u) {
  try {
    const { hostname } = new URL(u);
    return (
      hostname.includes("youtube.com") ||
      hostname.includes("youtu.be") ||
      hostname.includes("music.youtube.com")
    );
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
    metadata: { title: null, thumbnail: null, videoId: null },
    filename: null,
  };
}

function generateUniqueFilename(baseTitle, preset, outputDir) {
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

function buildAudioFilter(preset, durationSec) {
  if (preset === "SLOWED") {
    return [`rubberband=tempo=0.88:pitch=1.0`, `loudnorm=I=-14:TP=-1.0`].join(
      ","
    );
  }

  if (preset === "SPEED_125") {
    return [`rubberband=tempo=1.25:pitch=1.0`, `loudnorm=I=-14:TP=-1.0`].join(
      ","
    );
  }

  if (preset === "ULTRA_SLOWED") {
    return [
      `rubberband=tempo=0.12:pitch=1.0`,
      `aecho=0.7:0.5:100:0.25`,
      `lowpass=f=8000`,
      `highpass=f=30`,
      `loudnorm=I=-14:TP=-1.0`,
    ].join(",");
  }

  if (preset === "MUFFLED_SLOWED") {
    return [
      `lowpass=f=300`,
      `rubberband=tempo=0.85:pitch=0.95`,
      `aecho=0.4:0.5:60:0.15`,
      `loudnorm=I=-14:TP=-1.0`,
    ].join(",");
  }

  if (preset === "MUFFLED_SPEED") {
    return [
      `lowpass=f=600`,
      `rubberband=tempo=1.25:pitch=1.05`,
      `loudnorm=I=-14:TP=-1.0`,
    ].join(",");
  }

  if (preset === "DAYCORE") {
    return [
      `rubberband=tempo=0.8:pitch=0.8`,
      `aecho=0.3:0.4:30:0.15`,
      `loudnorm=I=-14:TP=-1.0`,
    ].join(",");
  }

  if (preset === "NIGHTCORE") {
    return [`rubberband=tempo=1.35:pitch=1.35`, `loudnorm=I=-14:TP=-1.0`].join(
      ","
    );
  }

  if (preset === "8D") {
    return [
      `aecho=0.5:0.45:50:0.25`,
      `apulsator=hz=0.2:width=0.5`,
      `alimiter=a=0.5`,
      `loudnorm=I=-14:TP=-1.0`,
    ].join(",");
  }

  return "loudnorm=I=-14:TP=-1.0";
}

function extractYouTubeVideoId(url) {
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

async function getYouTubeMetadata(url, jobId) {
  return new Promise((resolve) => {
    const args = ["-j", "--no-warnings", "--socket-timeout", "30", url];

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

        const videoId = data.id || extractYouTubeVideoId(url);
        const thumbnail = videoId
          ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
          : null;

        console.log(
          `[${jobId}] Metadata: "${title}" (${duration.toFixed(2)}s)`
        );
        resolve({ title, duration, thumbnail, videoId });
      } catch (e) {
        console.error(`[${jobId}] Error parsing yt-dlp metadata:`, e.message);
        resolve({
          title: `Audio ${jobId}`,
          duration: 0,
          thumbnail: null,
          videoId: null,
        });
      }
    });
  });
}

function getAudioStream(url, jobId) {
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

  const cookiesPath = path.join(__dirname, "cookies.txt");
  if (fs.existsSync(cookiesPath)) {
    baseArgs.push("--cookies", cookiesPath);
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

// ============================================
// PROCESSING FUNCTIONS
// ============================================

function processQueue() {
  while (ACTIVE_JOBS < MAX_CONCURRENT_JOBS && PENDING_QUEUE.length > 0) {
    const jobId = PENDING_QUEUE.shift();
    const job = JOBS.get(jobId);

    if (!job || job.status !== "PENDING") continue;

    ACTIVE_JOBS++;
    processJob(jobId)
      .catch((err) => {
        console.error(`[${jobId}] Unexpected error:`, err);
        const job = JOBS.get(jobId);
        if (job) {
          job.status = "ERROR";
          job.error = "Erro inesperado";
        }
      })
      .finally(() => {
        ACTIVE_JOBS--;
        processQueue();
      });
  }
}

async function processJob(id) {
  const job = JOBS.get(id);
  if (!job) return;

  try {
    const url = job.in;
    const preset = job.metadata.preset;

    job.status = "DOWNLOADING";
    job.progress = 0;

    console.log(`[${id}] Extracting metadata from URL...`);
    job.status = "EXTRACTING";
    const metadata = await getYouTubeMetadata(url, id);
    job.metadata = { ...job.metadata, ...metadata };
    const duration =
      typeof metadata.duration === "number"
        ? metadata.duration
        : parseFloat(metadata.duration) || 0;

    job.progress = 10;

    const filename = generateUniqueFilename(
      metadata.title,
      preset,
      STORAGE_OUT
    );
    const outPath = path.join(STORAGE_OUT, filename);
    job.out = outPath;
    job.filename = filename;

    console.log(`[${job.id}] Output filename: ${filename}`);

    const audioFilterStr = buildAudioFilter(preset, duration);

    job.status = "PROCESSING";
    job.progress = 15;

    const durationMs = Math.round(duration * 1000);

    await new Promise((resolve, reject) => {
      const audioSource = getAudioStream(url, id);

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
        outPath,
      ];

      const ff = spawn("ffmpeg", ffArgs);
      let ffStderr = "";

      audioSource.stream.pipe(ff.stdin);

      ff.stdout.on("data", (chunk) => {
        const s = String(chunk);
        const m = s.match(/out_time_ms=(\d+)/);
        if (m && durationMs > 0) {
          const outMs = parseInt(m[1], 10);
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
          job.progress = 95;
          resolve();
        } else {
          console.error(`[${job.id}] ffmpeg exit code ${code}`);
          reject(new Error(`ffmpeg failed with code ${code}`));
        }
      });
    });

    // 🔐 Upload para DigitalOcean Spaces
    console.log(`[${id}] Uploading to Spaces...`);
    job.progress = 96;

    const fileStream = fs.createReadStream(outPath);
    const spacesKey = `processed/${job.userId}/${id}.mp3`;

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET,
      Key: spacesKey,
      Body: fileStream,
      ContentType: "audio/mpeg",
      ACL: "private",
    });

    await s3Client.send(uploadCommand);
    const fileUrl = `https://${process.env.DO_SPACES_BUCKET}.${process.env.DO_SPACES_ENDPOINT}/${spacesKey}`;

    console.log(`[${id}] File uploaded to Spaces`);
    job.progress = 98;

    // 🔐 Atualizar job no banco
    await pool.query(
      `UPDATE jobs 
       SET status = $1, progress = $2, file_url = $3, expires_at = CURRENT_TIMESTAMP + INTERVAL '48 hours'
       WHERE id = $4`,
      ["DONE", 100, fileUrl, id]
    );

    job.progress = 100;
    job.status = "DONE";
    console.log(`[${job.id}] Job completed successfully`);
  } catch (err) {
    job.status = "ERROR";
    job.error = "Erro ao processar";
    job.progress = job.progress || 0;
    console.error(`[${job.id}] Error:`, err.message);

    // 🔐 Salvar erro (sem detalhes sensíveis)
    await pool.query(
      "UPDATE jobs SET status = $1, error_message = $2 WHERE id = $3",
      ["ERROR", "Erro durante processamento", id]
    );
  }
}

// ============================================
// API ENDPOINTS
// ============================================

// POST /process
app.post("/process", verifyToken, processLimiter, async (req, res) => {
  try {
    // 🔐 Validação
    const { error, value } = processSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { url, preset } = value;

    if (!isYouTubeUrl(url)) {
      return res.status(400).json({ error: "URL deve ser do YouTube" });
    }

    const id = nanoid(10);
    const job = makeJob(id);
    job.in = url;
    job.metadata.preset = preset;
    job.userId = req.userId;

    JOBS.set(id, job);
    PENDING_QUEUE.push(id);

    // 🔐 Salvar no banco
    try {
      await pool.query(
        `INSERT INTO jobs (id, user_id, status, preset, expires_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP + INTERVAL '48 hours')`,
        [id, req.userId, "PENDING", preset]
      );
    } catch (err) {
      console.error("Erro ao salvar job:", err.message);
      return res.status(500).json({ error: "Erro ao processar" });
    }

    console.log(`[${id}] New job queued for user ${req.userId}`);

    processQueue();
    res.json({ id });
  } catch (err) {
    console.error("[PROCESS ERROR]", err.message);
    res.status(500).json({ error: "Erro ao processar" });
  }
});

// GET /status/:id
app.get("/status/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const job = JOBS.get(id);

    if (!job) return res.status(404).json({ error: "Job não encontrado" });

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const result = {
      id: job.id,
      status: job.status,
      progress: job.progress,
      title: job.metadata.title || null,
      filename: job.filename || null,
      thumbnail: job.metadata.thumbnail || null,
      videoId: job.metadata.videoId || null,
    };

    if (job.status === "DONE") {
      result.output = `/file/${job.id}`;
    }

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(result);
  } catch (err) {
    console.error("[STATUS ERROR]", err.message);
    res.status(500).json({ error: "Erro ao buscar status" });
  }
});

// GET /file/:id
app.get("/file/:id", verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const job = JOBS.get(id);

    if (!job) return res.status(404).json({ error: "File não encontrado" });

    if (job.userId !== req.userId) {
      return res.status(403).json({ error: "Acesso negado" });
    }

    if (job.status !== "DONE")
      return res.status(400).send("Arquivo ainda não está pronto");

    const filePath = job.out;

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("Arquivo não encontrado");
    }

    const fileSize = fs.statSync(filePath).size;
    const downloadName = job.filename || path.basename(filePath);

    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Content-Type", "audio/mpeg");
    res.set("Content-Disposition", `inline; filename="${downloadName}"`);
    res.set("Content-Length", fileSize);

    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(`[${id}] Error sending file:`, err.message);
      }
    });
  } catch (err) {
    console.error("[FILE ERROR]", err.message);
    res.status(500).json({ error: "Erro ao servir arquivo" });
  }
});

// GET /my-jobs
app.get("/my-jobs", verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, status, progress, preset, title, filename, created_at, expires_at, thumbnail, video_id
       FROM jobs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[MY-JOBS ERROR]", err.message);
    res.status(500).json({ error: "Erro ao buscar jobs" });
  }
});

// GET /queue-stats
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

// ============================================
// CLEANUP TASK
// ============================================

setInterval(async () => {
  try {
    const result = await pool.query(
      "SELECT id, user_id FROM jobs WHERE expires_at < CURRENT_TIMESTAMP LIMIT 100"
    );
    if (result.rows.length > 0) {
      console.log(
        `[CLEANUP] Deletando ${result.rows.length} jobs expirados...`
      );

      for (const row of result.rows) {
        try {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.DO_SPACES_BUCKET,
            Key: `processed/${row.user_id}/${row.id}.mp3`,
          });
          await s3Client.send(deleteCommand);
        } catch (err) {
          console.error(`[CLEANUP] Erro ao deletar ${row.id}:`, err.message);
        }
      }

      await pool.query("DELETE FROM jobs WHERE expires_at < CURRENT_TIMESTAMP");
      console.log(`[CLEANUP] Concluído`);
    }
  } catch (err) {
    console.error("[CLEANUP ERROR]:", err.message);
  }
}, 60 * 60 * 1000);

// ============================================
// SERVER START
// ============================================

const server = app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Database: ${process.env.DB_HOST}`);
  console.log(`💾 Storage: ${process.env.DO_SPACES_BUCKET}`);
});

// 🔐 Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("📊 SIGTERM recebido, encerrando gracefully...");
  server.close(async () => {
    await pool.end();
    console.log("✅ Servidor encerrado");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("📊 SIGINT recebido, encerrando gracefully...");
  server.close(async () => {
    await pool.end();
    console.log("✅ Servidor encerrado");
    process.exit(0);
  });
});
