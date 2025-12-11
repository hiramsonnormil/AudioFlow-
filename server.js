/**
 * Main Server Application
 * Arquitetura MVC - Model-View-Controller
 */

import express from "express";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import passport from "passport";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import { fileURLToPath } from "url";
import { ProcessController } from "./src/controllers/ProcessController.js";
import { createProcessRoutes } from "./src/routes/processRoutes.js";
import authRoutes from "./src/routes/auth.js";
import jobsRoutes from "./src/routes/jobs.js";
import r2TestRoutes from "./src/routes/r2Test.js";
import freeRoutes from "./src/routes/free.js";
import recentsRoutes from "./src/routes/recents.js";
import downloadRoutes from "./src/routes/download.js";
import subscriptionRoutes from "./src/routes/subscriptions.js";
import webhookRoutes from "./src/routes/webhooks.js";
import validateYoutubeRoutes from "./src/routes/validateYoutube.js";
import { connectDB } from "./src/config/db.js";
import { initStorage } from "./src/utils/storage.js";
import { configurePassport } from "./src/config/passport-config.js";
import { securityConfig, isOriginAllowed } from "./src/config/security.js";
import { apiLimiter, authLimiter, freeProcessLimiter, validationLimiter, downloadLimiter, subscriptionLimiter } from "./src/middleware/rateLimiters.js";
import { initSubscriptionScheduler } from "./src/utils/subscriptionScheduler.js";

// ===== CONFIGURAÇÃO =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 8080;

const trustProxyCount = Number.isFinite(securityConfig.trustProxy)
  ? securityConfig.trustProxy
  : 1;
app.set("trust proxy", trustProxyCount);
app.disable("x-powered-by");

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS origin denied"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  exposedHeaders: ["Content-Disposition"],
};

const corsMiddleware = cors(corsOptions);

// ===== MIDDLEWARE =====
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(corsMiddleware);
app.options("*", corsMiddleware);
app.use(express.json({ limit: securityConfig.jsonLimit }));
app.use(express.urlencoded({ extended: true, limit: securityConfig.urlencodedLimit }));
app.use(cookieParser());
app.use(hpp());
app.use(mongoSanitize());
app.use(xssClean());
app.use(compression());
app.use(express.static(path.join(__dirname, "public")));

app.use((err, req, res, next) => {
  if (err && err.message === "CORS origin denied") {
    return res.status(403).json({ error: "forbidden_origin" });
  }
  return next(err);
});

// Initialize Passport
configurePassport();
app.use(passport.initialize());

// ===== PAGE ROUTES =====
// Rota principal (index)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Página de processamento
app.get("/process", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "process.html"));
});

// Página de processamento em lote
app.get("/batch", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "batch.html"));
});

// Página de planos
app.get("/plans", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "plans.html"));
});

// Página de conta
app.get("/account", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "account.html"));
});

// Página de processamentos recentes
app.get("/recents", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "recents.html"));
});

// Página de download
app.get("/download", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "download.html"));
});

// ===== STORAGE SETUP =====
const STORAGE_BASE = path.join(__dirname, "storage");
const STORAGE_IN = path.join(STORAGE_BASE, "in");
const STORAGE_OUT = path.join(STORAGE_BASE, "out");
const STORAGE_META = path.join(STORAGE_BASE, "meta");

fs.mkdirSync(STORAGE_IN, { recursive: true });
fs.mkdirSync(STORAGE_OUT, { recursive: true });
fs.mkdirSync(STORAGE_META, { recursive: true });

// Initialize storage util
initStorage(STORAGE_BASE);

// Connect database (users, presets)
connectDB().catch(() => {
  console.warn("⚠️  Continuing without DB connection. Check MONGODB_URI.");
});

// ===== CONTROLLERS & ROUTES =====
const processController = new ProcessController(STORAGE_BASE);
const processRoutes = createProcessRoutes(processController);

app.use("/", processRoutes);

// ===== NEW API ROUTES =====
// Rotas específicas com rate limiters próprios (devem vir ANTES do limiter global)
app.use("/api/auth", authLimiter, authRoutes); // 20/15min
app.use("/api/free", freeProcessLimiter, freeRoutes); // 8/hora
app.use("/api/validate-youtube", validationLimiter, validateYoutubeRoutes); // 10/min
app.use("/api/download", downloadLimiter, downloadRoutes); // 30/min
// Apply fine-grained route limits inside the router (e.g., 5/min for PIX creation)
app.use("/api/subscriptions", subscriptionRoutes);

// Rate limiter global para rotas restantes
app.use("/api", apiLimiter); // 500/15min

// Rotas sem rate limiter específico
app.use("/api/jobs", jobsRoutes);
app.use("/api/r2-test", r2TestRoutes);
app.use("/api", recentsRoutes);
app.use("/api", webhookRoutes);

// ===== DOCUMENTATION ROUTES =====
app.get("/api", (req, res) => {
  res.json({
    name: "Audio FX Processor - MVC API",
    version: "1.0.0",
    endpoints: {
      POST: {
        "/process": "Inicia um novo processamento de áudio",
      },
      GET: {
        "/status/:id": "Obtém o status de um job",
        "/queue-stats": "Obtém estatísticas da fila de processamento",
        "/file/:id": "Faz download do arquivo processado",
        "/api": "Esta documentação",
      },
    },
    example: {
      processRequest: {
        url: "POST /process",
        body: {
          url: "https://youtu.be/dQw4w9WgXcQ",
          preset: "NIGHTCORE",
        },
      },
      validPresets: [
        "SLOWED",
        "SPEED_125",
        "ULTRA_SLOWED",
        "MUFFLED_SLOWED",
        "MUFFLED_SPEED",
        "DAYCORE",
        "NIGHTCORE",
        "8D",
      ],
    },
  });
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  
  // Se for requisição de API, retornar JSON
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res
      .status(500)
      .json({ error: "Internal server error", message: err.message });
  }
  
  // Para outras requisições, retornar página HTML de erro
  res.status(500).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>500 - Erro interno | phona</title>
      <style>
        body { font-family: system-ui; background: #0A0A0A; color: #fff; text-align: center; padding: 2rem; }
        h1 { color: #c28c66; }
      </style>
    </head>
    <body>
      <h1>500 - Erro interno do servidor</h1>
      <p>Desculpe, algo deu errado. Por favor, tente novamente mais tarde.</p>
      <a href="/" style="color: #c28c66;">Voltar ao início</a>
    </body>
    </html>
  `);
});

// 404 Handler - Serve página personalizada para navegação ou JSON para API
app.use((req, res) => {
  // Se for requisição de API, retornar JSON
  if (req.path.startsWith('/api/') || req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(404).json({ error: "Not found" });
  }
  
  // Para outras requisições, servir página 404 personalizada
  res.status(404).sendFile(path.join(__dirname, 'public', 'html', '404.html'));
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("\n");
  console.log("╔════════════════════════════════════════╗");
  console.log("║  🎵 Audio FX Processor (MVC)          ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log("\n📚 API Documentation: http://localhost:${PORT}/api\n");
  initSubscriptionScheduler();
});
