/**
 * Main Server Application
 * Arquitetura MVC - Model-View-Controller
 */

import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ProcessController } from "./src/controllers/ProcessController.js";
import { createProcessRoutes } from "./src/routes/processRoutes.js";

// ===== CONFIGURAÇÃO =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// ===== MIDDLEWARE =====
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===== PAGE ROUTES =====
// Rota principal (index)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

// Página de processamento
app.get("/process", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "process.html"));
});

// Rota para compatibilidade com URLs antigas (process.html)
app.get("/process.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "process.html"));
});

// Dashboard
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "dashboard.html"));
});

// Página de processamento em lote
app.get("/batch", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "batch.html"));
});

// ===== ROTAS DE COMPATIBILIDADE =====
// Para manter compatibilidade com URLs antigas (.html)
app.get("/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "index.html"));
});

app.get("/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "dashboard.html"));
});

app.get("/batch.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "html", "batch.html"));
});

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

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log("\n");
  console.log("╔════════════════════════════════════════╗");
  console.log("║  🎵 Audio FX Processor (MVC)          ║");
  console.log("╚════════════════════════════════════════╝");
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log("\n📚 API Documentation: http://localhost:${PORT}/api\n");
});
