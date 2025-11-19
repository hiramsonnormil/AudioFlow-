// Gerenciador de fila em massa
class BatchQueueManager {
  constructor() {
    this.urls = [];
    this.jobs = new Map(); // Map<jobId, jobData>
    this.maxConcurrent = 10;
    this.activeJobs = new Set();
    this.pollInterval = null;
  }

  addUrl(url) {
    if (this.urls.length >= 10) {
      throw new Error("Máximo de 10 URLs atingido");
    }
    if (this.urls.includes(url)) {
      throw new Error("URL já adicionada");
    }
    this.urls.push(url);
  }

  removeUrl(url) {
    const idx = this.urls.indexOf(url);
    if (idx >= 0) {
      this.urls.splice(idx, 1);
    }
  }

  clearUrls() {
    this.urls = [];
  }

  parseMultipleUrls(text) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .map((line) => cleanUrl(line))
      .filter((line) => line.length > 0);
  }

  getStats() {
    let total = 0;
    let processing = 0;
    let done = 0;
    let error = 0;

    for (const job of this.jobs.values()) {
      total++;
      if (
        job.status === "PROCESSING" ||
        job.status === "DOWNLOADING" ||
        job.status === "EXTRACTING"
      ) {
        processing++;
      } else if (job.status === "DONE") {
        done++;
      } else if (job.status === "ERROR") {
        error++;
      }
    }

    return { total, processing, done, error };
  }
}

const manager = new BatchQueueManager();

// Elementos DOM
const batchUrlEl = document.getElementById("batchUrl");
const batchUrlsMultiEl = document.getElementById("batchUrlsMulti");
const batchPresetEl = document.getElementById("batchPreset");
const addUrlBtn = document.getElementById("addUrlBtn");
const batchStartBtn = document.getElementById("batchStartBtn");
const batchClearBtn = document.getElementById("batchClearBtn");
const urlCountEl = document.getElementById("urlCount");
const jobsQueueEl = document.getElementById("jobsQueue");
const statsTotal = document.getElementById("statsTotal");
const statsProcessing = document.getElementById("statsProcessing");
const statsDone = document.getElementById("statsDone");
const statsError = document.getElementById("statsError");
const errorMsg = document.getElementById("batchErrorMsg");

// Limpar e normalizar URL
function cleanUrl(url) {
  // Remove espaços, colchetes e outros caracteres indesejados
  return url
    .trim()
    .replace(/[\[\]]/g, "") // Remove colchetes
    .replace(/[<>]/g, "") // Remove <> (comum em markdown)
    .trim();
}

// Validar URL do YouTube
function isValidYouTubeUrl(url) {
  try {
    const cleanedUrl = cleanUrl(url);
    const urlObj = new URL(cleanedUrl);
    return (
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("youtu.be")
    );
  } catch (e) {
    return false;
  }
}

// Mostrar erro
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
  setTimeout(() => {
    errorMsg.classList.add("hidden");
  }, 5000);
}

// Adicionar URL
addUrlBtn.addEventListener("click", () => {
  let urlsToAdd = [];

  // Se houver texto na textarea de múltiplas URLs
  const multiText = batchUrlsMultiEl.value.trim();
  if (multiText) {
    urlsToAdd = manager.parseMultipleUrls(multiText);
    batchUrlsMultiEl.value = ""; // Limpar textarea
  } else if (batchUrlEl.value.trim()) {
    urlsToAdd = [batchUrlEl.value.trim()];
    batchUrlEl.value = ""; // Limpar input
  } else {
    showError("Cole uma URL do YouTube");
    return;
  }

  let added = 0;
  let skipped = 0;
  let invalidUrls = [];

  for (let url of urlsToAdd) {
    // Limpar e normalizar URL
    url = cleanUrl(url);

    if (!url) {
      skipped++;
      continue;
    }

    if (!isValidYouTubeUrl(url)) {
      skipped++;
      invalidUrls.push(url.substring(0, 30) + "...");
      continue;
    }

    try {
      manager.addUrl(url);
      added++;
    } catch (err) {
      console.warn(err.message);
      skipped++;
    }
  }

  if (added > 0) {
    updateUrlList();
    console.log(
      `✅ ${added} URL${added > 1 ? "s" : ""} adicionada${
        added > 1 ? "s" : ""
      }${
        skipped > 0 ? ` | ❌ ${skipped} inválida${skipped > 1 ? "s" : ""}` : ""
      }`
    );
  }

  if (skipped > 0 && added === 0) {
    showError(
      `❌ ${skipped} URL${skipped > 1 ? "s" : ""} inválida${
        skipped > 1 ? "s" : ""
      }`
    );
  } else if (skipped > 0 && added > 0) {
    showError(
      `✅ ${added} adicionada${added > 1 ? "s" : ""} | ❌ ${skipped} inválida${
        skipped > 1 ? "s" : ""
      }`
    );
  }
});

// Atualizar lista de URLs
function updateUrlList() {
  urlCountEl.textContent = manager.urls.length;
}

// Limpar tudo
batchClearBtn.addEventListener("click", () => {
  manager.clearUrls();
  manager.jobs.clear();
  manager.activeJobs.clear();
  updateUrlList();
  updateJobsUI();
  updateStats();
});

// Iniciar processamento
batchStartBtn.addEventListener("click", async () => {
  if (manager.urls.length === 0) {
    showError("Adicione pelo menos uma URL");
    return;
  }

  const preset = batchPresetEl.value;
  batchStartBtn.disabled = true;

  try {
    // Criar jobs para todas as URLs
    for (const url of manager.urls) {
      const r = await fetch("/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, preset }),
      });

      if (!r.ok) {
        const j = await r.json();
        throw new Error(j.error || "server error");
      }

      const j = await r.json();
      manager.jobs.set(j.id, {
        id: j.id,
        url,
        status: "PENDING",
        progress: 0,
        title: "Carregando...",
        filename: null,
        error: null,
      });
    }

    manager.clearUrls();
    updateUrlList();
    updateJobsUI();
    updateStats();

    // Iniciar polling
    if (!manager.pollInterval) {
      manager.pollInterval = setInterval(pollJobs, 500);
    }
  } catch (err) {
    showError("Erro: " + err.message);
  } finally {
    batchStartBtn.disabled = false;
  }
});

// Polling dos jobs
async function pollJobs() {
  let anyActive = false;

  for (const [jobId, job] of manager.jobs) {
    if (job.status === "DONE" || job.status === "ERROR") {
      continue; // Job já finalizou
    }

    try {
      const r = await fetch(`/status/${jobId}`);
      if (!r.ok) continue;

      const data = await r.json();
      job.status = data.status;
      job.progress = data.progress || 0;
      job.title = data.title || "Processando...";
      job.filename = data.filename;
      job.error = data.error || null;

      if (data.status !== "DONE" && data.status !== "ERROR") {
        anyActive = true;
      }
    } catch (err) {
      console.error(`Error polling job ${jobId}:`, err);
    }
  }

  updateJobsUI();
  updateStats();

  if (!anyActive && manager.jobs.size > 0) {
    // Todos os jobs terminaram
    clearInterval(manager.pollInterval);
    manager.pollInterval = null;
  }
}

// Atualizar UI dos jobs
function updateJobsUI() {
  if (manager.jobs.size === 0) {
    jobsQueueEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>Nenhum job adicionado</p>
      </div>
    `;
    return;
  }

  jobsQueueEl.innerHTML = Array.from(manager.jobs.values())
    .map((job) => createJobCard(job))
    .join("");

  // Adicionar event listeners aos botões de download
  document.querySelectorAll(".job-download-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const jobId = e.target.dataset.jobId;
      window.location.href = `/file/${jobId}`;
    });
  });
}

// Criar card de job
function createJobCard(job) {
  const statusClass =
    job.status === "DONE"
      ? "done"
      : job.status === "ERROR"
      ? "error"
      : "processing";
  const statusText =
    job.status === "PENDING"
      ? "Aguardando"
      : job.status === "DOWNLOADING"
      ? "Baixando"
      : job.status === "EXTRACTING"
      ? "Extraindo"
      : job.status === "PROCESSING"
      ? "Processando"
      : job.status === "DONE"
      ? "Concluído"
      : "Erro";

  const progressPercent = Math.min(100, Math.max(0, job.progress || 0));

  return `
    <div class="job-card ${statusClass}">
      <div class="job-header">
        <h3 class="job-title">${escapeHtml(job.title)}</h3>
        <span class="job-status ${statusClass}">${statusText}</span>
      </div>
      <div class="job-progress">
        <div class="job-progress-bar" style="width: ${progressPercent}%"></div>
      </div>
      <div class="job-info">
        <span>ID: ${job.id}</span>
        <span>${progressPercent}%</span>
        ${job.filename ? `<span>📁 ${escapeHtml(job.filename)}</span>` : ""}
      </div>
      ${
        job.error
          ? `<div style="margin-top: 8px; padding: 8px; background: hsl(0, 70%, 20%); border-radius: 3px; font-size: 0.85rem; color: hsl(0, 100%, 80%);">${escapeHtml(
              job.error
            )}</div>`
          : ""
      }
      ${
        job.status === "DONE"
          ? `<div class="job-footer">
               <button class="job-download-btn" data-job-id="${job.id}">⬇️ Download</button>
             </div>`
          : ""
      }
    </div>
  `;
}

// Escapar HTML
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Atualizar estatísticas
function updateStats() {
  const stats = manager.getStats();
  statsTotal.textContent = stats.total;
  statsProcessing.textContent = stats.processing;
  statsDone.textContent = stats.done;
  statsError.textContent = stats.error;
}

// Inicializar tema
(function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const root = document.documentElement;

  function apply(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      btn.textContent = "🌞";
      localStorage.setItem("theme", "light");
    } else {
      root.removeAttribute("data-theme");
      btn.textContent = "🌚";
      localStorage.setItem("theme", "dark");
    }
  }

  const saved = localStorage.getItem("theme");
  apply(saved === "light" ? "light" : "dark");

  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    apply(next);
  });
})();

// Mobile nav toggle
(function initNavToggle() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return;
  toggle.textContent = "☰";
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => {
    if (!links.classList.contains("open")) return;
    if (e.target === toggle || links.contains(e.target)) return;
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
})();
