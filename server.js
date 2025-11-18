/**
 * Main Server Application
 * Arquitetura MVC - Model-View-Controller
 * Com persistência em MongoDB Atlas
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";

import { ProcessController } from "./src/controllers/ProcessController.js";
import { createProcessRoutes } from "./src/routes/processRoutes.js";
import { databaseService } from "./src/services/DatabaseService.js";

// ===== CONFIGURAÇÃO =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== STORAGE SETUP =====
const STORAGE_BASE = path.join(__dirname, "storage");
const STORAGE_IN = path.join(STORAGE_BASE, "in");
const STORAGE_OUT = path.join(STORAGE_BASE, "out");
const STORAGE_META = path.join(STORAGE_BASE, "meta");

fs.mkdirSync(STORAGE_IN, { recursive: true });
fs.mkdirSync(STORAGE_OUT, { recursive: true });
fs.mkdirSync(STORAGE_META, { recursive: true });

console.log("📁 Storage initialized:");
console.log(`  - Input: ${STORAGE_IN}`);
console.log(`  - Output: ${STORAGE_OUT}`);
console.log(`  - Metadata: ${STORAGE_META}`);

// ===== CONTROLLERS & ROUTES =====
const processController = new ProcessController(STORAGE_BASE);
const processRoutes = createProcessRoutes(processController);

app.use("/", processRoutes);

// ===== DATABASE HEALTH CHECK ROUTE =====
app.get("/health/db", (req, res) => {
  const status = databaseService.getStatus();
  res.json({
    database: status,
    server: "running",
    timestamp: new Date(),
  });
});

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
  res
    .status(500)
    .json({ error: "Internal server error", message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ===== START SERVER WITH DATABASE CONNECTION =====
async function startServer() {
  try {
    console.log("\n");
    console.log("╔════════════════════════════════════════╗");
    console.log("║  🎵 Audio FX Processor (MVC + Atlas)  ║");
    console.log("╚════════════════════════════════════════╝\n");

    // Conectar ao MongoDB
    await databaseService.connect();

    // Fazer seed dos dados iniciais
    await databaseService.seed();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
      console.log(`🔗 Database Health: http://localhost:${PORT}/health/db\n`);
    });
  } catch (error) {
    console.error("❌ Falha ao iniciar servidor:", error.message);
    process.exit(1);
  }
}

startServer();
