const barInner = document.getElementById("barInner");
const statusText = document.getElementById("statusText");
const titleEl = document.getElementById("title");
const thumbnail = document.getElementById("thumbnail");
const downloadLink = document.getElementById("downloadLink");
const audioPreview = document.getElementById("audioPreview");
const errorMsg = document.getElementById("errorMsg");
const artEl = document.querySelector(".fxproc-art");

let pollId = null;
let lastProgress = -1;

// Obter ID do job da URL
const params = new URLSearchParams(window.location.search);
const jobId = params.get("id");

console.log("Job ID:", jobId);

if (!jobId) {
  showError("Job ID não encontrado. Retorne ao início.");
} else {
  // Tentar usar thumbnail precarregada da sessão anterior
  const prefetchedThumbUrl = sessionStorage.getItem("prefetchedThumbUrl");
  if (prefetchedThumbUrl) {
    thumbnail.src = prefetchedThumbUrl;
    thumbnail.classList.remove("loading-placeholder");
    console.log("Using prefetched thumbnail");
  }

  // Iniciar polling do status
  startPoll(jobId);
}

// Smooth spinning control (decelerate on pause)
let spinRaf = null;
let spinAngle = 0; // in degrees
let spinVel = 0; // deg/sec
let spinTarget = 0; // deg/sec
let lastTs = null;
const prefersReduce = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;
const MAX_SPEED = prefersReduce ? 30 : 120; // deg/sec
const ACCEL = prefersReduce ? 3 : 8; // easing factor per second

function spinFrame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000); // clamp dt for stutter
  lastTs = ts;
  // Ease velocity towards target (critical damping style)
  const k = Math.min(ACCEL * dt, 1);
  spinVel += (spinTarget - spinVel) * k;
  spinAngle = (spinAngle + spinVel * dt) % 360;
  if (thumbnail) thumbnail.style.transform = `rotate(${spinAngle}deg)`;
  if (artEl) artEl.style.setProperty("--fx-angle", `${spinAngle}deg`);
  spinRaf = requestAnimationFrame(spinFrame);
}
function ensureSpinLoop() {
  if (spinRaf == null) spinRaf = requestAnimationFrame(spinFrame);
}
function setPlaying(on) {
  spinTarget = on ? MAX_SPEED : 0;
  artEl?.classList.toggle("is-playing", !!on);
  ensureSpinLoop();
}

// Hook audio events
if (audioPreview) {
  audioPreview.addEventListener("play", () => setPlaying(true));
  audioPreview.addEventListener("playing", () => setPlaying(true));
  [
    "pause",
    "ended",
    "waiting",
    "stalled",
    "suspend",
    "abort",
    "emptied",
    "error",
  ].forEach((ev) => audioPreview.addEventListener(ev, () => setPlaying(false)));
}

// Cleanup
window.addEventListener("visibilitychange", () => {
  if (document.hidden && spinRaf) {
    cancelAnimationFrame(spinRaf);
    spinRaf = null;
    lastTs = null;
  } else if (!document.hidden) {
    ensureSpinLoop();
  }
});

function startPoll(id) {
  if (pollId) clearInterval(pollId);

  // Função para extrair video ID do URL do YouTube
  function extractVideoId(url) {
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

  // Precarregar thumbnail assim que possível (sem esperar API)
  let thumbPreloaded = false;

  pollId = setInterval(async () => {
    try {
      const statusUrl = `/status/${id}`;
      const r = await fetch(statusUrl);
      if (!r.ok) throw new Error("status fetch failed");
      const j = await r.json();

      // Precarregar thumbnail na primeira chamada bem-sucedida (se não foi feito ainda)
      if (!thumbPreloaded && !thumbnail.src) {
        let videoId = j.videoId;
        if (!videoId && j.metadata?.youtubeUrl) {
          videoId = extractVideoId(j.metadata.youtubeUrl);
        }
        if (videoId) {
          const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          const img = new Image();
          img.onload = () => {
            thumbnail.src = thumbUrl;
            thumbnail.classList.remove("loading-placeholder");
          };
          img.onerror = () => {
            const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            thumbnail.src = fallbackUrl;
            thumbnail.classList.remove("loading-placeholder");
          };
          img.src = thumbUrl;
          thumbPreloaded = true;
        }
      }

      // Atualizar barra de progresso apenas se mudou
      if (j.progress !== lastProgress) {
        barInner.style.width = j.progress + "%";
        statusText.textContent = `${j.status} — ${j.progress}%`;
        lastProgress = j.progress;
      }

      // Carregar título
      if (j.title && titleEl.textContent === "Processando...") {
        titleEl.textContent = j.title;
      }

      // Job concluído
      if (j.status === "DONE") {
        clearInterval(pollId);
        statusText.textContent = "✅ Concluído";

        console.log("\n===========================================");
        console.log("JOB DONE RESPONSE:");
        console.log("Job ID:", j.id);
        console.log("Title:", j.title);
        console.log("Filename:", j.filename);
        console.log("Output URL:", j.output);
        console.log("File exists on server:", j.fileExists);
        console.log("File size:", j.fileSize);
        console.log("===========================================\n");

        if (j.output) {
          const audioUrl = `${j.output}?t=${Date.now()}`;

          console.log("Loading audio from:", audioUrl);

          // Limpar áudio anterior
          audioPreview.pause();
          audioPreview.src = "";
          audioPreview.load();

          // Aguardar e carregar novo áudio
          setTimeout(() => {
            console.log("Setting audio src to:", audioUrl);
            audioPreview.src = audioUrl;
            audioPreview.load();

            // Log dos eventos de áudio
            audioPreview.oncanplay = () => console.log("Audio can play");
            audioPreview.onerror = (e) => console.error("Audio error:", e);
            audioPreview.onloadeddata = () => console.log("Audio data loaded");
          }, 300);

          // Mostrar botão de download com nome real
          const downloadName = j.filename || `audio_${id}.mp3`;
          downloadLink.href = audioUrl;
          downloadLink.download = downloadName;
          downloadLink.classList.remove("hidden");
          downloadLink.textContent = `⬇️ Download ${downloadName}`;

          console.log("Download button set to:", audioUrl);
        }
      }

      // Erro no processamento
      if (j.status === "ERROR") {
        clearInterval(pollId);
        const errorText = j.error || "processing failed";
        showError("❌ Erro: " + errorText);
        statusText.textContent = "Erro ao processar";
      }
    } catch (err) {
      console.error("Polling error:", err);
      // Não limpar em erro, tentar novamente
    }
  }, 500); // Reduzido de 1000ms para 500ms - mais responsivo
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

// Animar volta para home com transição suave
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();

    // Criar elemento com animação de carregamento
    const loadingScreen = document.createElement("div");
    loadingScreen.className = "transition-loading";
    loadingScreen.innerHTML = `
      <div class="vinyl"></div>
      <div class="loading-text">
        Voltando<span class="loading-dots"></span>
      </div>
    `;
    document.body.appendChild(loadingScreen);

    // Limpar polling antes de sair
    if (pollId) clearInterval(pollId);

    // Aguardar animação e voltar
    setTimeout(() => {
      window.location.href = "/";
    }, 800);
  });
}

// Limpar ao sair da página
window.addEventListener("beforeunload", () => {
  if (pollId) clearInterval(pollId);
});

// ============ UI Enhancements ============
// Theme toggle (dark default, supports light)
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
