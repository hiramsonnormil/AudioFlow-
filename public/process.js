const processBarInner = document.getElementById("processBarInner"); // barra do processamento
const progressBar = document.getElementById("progressBar"); // container barra do player
const playerBarInner = document.getElementById("playerBarInner"); // barra do player

const statusText = document.getElementById("statusText");
const statusBadge = document.getElementById("statusBadge");
const statusLabel = document.getElementById("statusLabel");
const titleEl = document.getElementById("title");
const thumbnail = document.getElementById("thumbnail");
const downloadLink = document.getElementById("downloadLink");
const audioPreview = document.getElementById("audioPreview");
const errorMsg = document.getElementById("errorMsg");
const artEl = document.querySelector(".fxproc-art");
const playBtn = document.getElementById("playBtn");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");

let pollId = null;
let lastProgress = -1;
let isPlaying = false;

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

// ===== PLAY STATE / TOGGLE =====

// Controle visual (se quiser animar capa, etc)
function setPlaying(on) {
  artEl?.classList.toggle("is-playing", !!on);
}

// Alternar play/pause
function togglePlay() {
  if (!audioPreview) return;
  if (audioPreview.paused) {
    audioPreview.play();
  } else {
    audioPreview.pause();
  }
}

// Eventos do áudio
if (audioPreview) {
  audioPreview.addEventListener("play", () => {
    setPlaying(true);
    isPlaying = true;
    updatePlayButton();
  });

  audioPreview.addEventListener("playing", () => {
    setPlaying(true);
    isPlaying = true;
    updatePlayButton();
  });

  [
    "pause",
    "ended",
    "waiting",
    "stalled",
    "suspend",
    "abort",
    "emptied",
    "error",
  ].forEach((ev) =>
    audioPreview.addEventListener(ev, () => {
      setPlaying(false);
      isPlaying = false;
      updatePlayButton();
    })
  );

  // Atualiza tempo e barra do PLAYER
  audioPreview.addEventListener("timeupdate", () => {
    if (!audioPreview.duration) return;

    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(audioPreview.currentTime);
    }

    if (playerBarInner) {
      const percent = (audioPreview.currentTime / audioPreview.duration) * 100;
      playerBarInner.style.width = `${percent}%`;
    }
  });

  // Duração total
  audioPreview.addEventListener("loadedmetadata", () => {
    if (durationEl && audioPreview.duration) {
      durationEl.textContent = formatTime(audioPreview.duration);
    }
  });
}

// Play/Pause – só funciona se clicar no SVG / conteúdo interno
if (playBtn && audioPreview) {
  playBtn.addEventListener("click", (e) => {
    const svg = playBtn.querySelector("svg");
    if (!svg) return;

    if (e.target === svg || svg.contains(e.target)) {
      e.stopPropagation();
      togglePlay();
    }
  });
}

// Clique na barra do PLAYER = seek
if (progressBar && audioPreview) {
  progressBar.addEventListener("click", (e) => {
    if (!audioPreview.duration) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.min(Math.max(clickX / rect.width, 0), 1);

    audioPreview.currentTime = ratio * audioPreview.duration;
  });
}

// Helpers

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function updatePlayButton() {
  if (!playBtn) return;

  if (isPlaying) {
    playBtn.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 4h4v16H6zM14 4h4v16h-4z"/>
      </svg>
    `;
  } else {
    playBtn.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z"/>
      </svg>
    `;
  }
}

// Troca suave: some barra de processamento, aparece barra do player
function switchToPlayerBar() {
  const processBar = document.getElementById("processBar");
  if (processBar) {
    processBar.classList.add("fx-hide");
  }
  if (progressBar) {
    progressBar.classList.add("fx-show");
  }
}

function startPoll(id) {
  if (pollId) clearInterval(pollId);

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

  let thumbPreloaded = false;

  pollId = setInterval(async () => {
    try {
      const statusUrl = `/status/${id}`;
      const r = await fetch(statusUrl);
      if (!r.ok) throw new Error("status fetch failed");
      const j = await r.json();

      // Thumbnail
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

      // Barra de PROCESSAMENTO (só enquanto não terminou)
      if (j.progress !== lastProgress && j.status !== "DONE") {
        if (processBarInner) {
          processBarInner.style.width = j.progress + "%";
        }

        let statusMessage = "";
        if (j.progress < 20) statusMessage = "Baixando áudio...";
        else if (j.progress < 40) statusMessage = "Extraindo áudio...";
        else if (j.progress < 60) statusMessage = "Aplicando efeitos...";
        else if (j.progress < 80) statusMessage = "Renderizando áudio...";
        else if (j.progress < 100) statusMessage = "Finalizando...";

        statusText.textContent = `${statusMessage} ${j.progress}%`;

        if (statusLabel) {
          statusLabel.textContent = `${j.progress}%`;
        }

        lastProgress = j.progress;
      }

      // Título
      if (j.title && titleEl.textContent === "Processando...") {
        titleEl.textContent = j.title;
      }

      // DONE
      // Job concluído
      if (j.status === "DONE") {
        clearInterval(pollId);

        // Atualiza o título principal
        if (j.title && j.title.trim()) {
          titleEl.textContent = j.title;
        } else {
          titleEl.textContent = "Seu áudio está pronto";
        }

        // Texto de status
        statusText.textContent = "✅ Pronto para reproduzir!";

        // Badge verde
        if (statusBadge) {
          statusBadge.style.background = "rgba(34, 197, 94, 0.1)";
          statusBadge.style.borderColor = "rgba(34, 197, 94, 0.3)";
          statusBadge.style.color = "#22c55e";
          if (statusLabel) {
            statusLabel.textContent = "Concluído";
          }
          const statusDot = statusBadge.querySelector(".status-dot");
          if (statusDot) {
            statusDot.style.background = "#22c55e";
            statusDot.style.animation = "none";
          }
        }

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

            audioPreview.oncanplay = () => console.log("Audio can play");
            audioPreview.onerror = (e) => console.error("Audio error:", e);
            audioPreview.onloadeddata = () => console.log("Audio data loaded");
          }, 300);

          // Download
          const downloadName = j.filename || `audio_${id}.mp3`;
          downloadLink.href = audioUrl;
          downloadLink.download = downloadName;
          downloadLink.classList.remove("hidden");
          downloadLink.style.display = "inline-flex";
          downloadLink.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Download</span>
    `;
        }

        // troca barra de processamento -> barra do player
        switchToPlayerBar();
      }

      // ERROR
      if (j.status === "ERROR") {
        clearInterval(pollId);
        const errorText = j.error || "processing failed";
        showError("❌ Erro: " + errorText);
        statusText.textContent = "Erro ao processar";

        if (statusBadge) {
          statusBadge.style.background = "rgba(239, 68, 68, 0.1)";
          statusBadge.style.borderColor = "rgba(239, 68, 68, 0.3)";
          statusBadge.style.color = "#ef4444";
          if (statusLabel) {
            statusLabel.textContent = "Erro";
          }
          const statusDot = statusBadge.querySelector(".status-dot");
          if (statusDot) {
            statusDot.style.background = "#ef4444";
            statusDot.style.animation = "none";
          }
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      // tenta de novo no próximo tick
    }
  }, 500);
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
  errorMsg.style.display = "block";
}

// Animar volta para home com transição suave
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const loadingScreen = document.createElement("div");
    loadingScreen.className = "transition-loading";
    loadingScreen.innerHTML = `
      <div class="vinyl"></div>
      <div class="loading-text">
        Voltando<span class="loading-dots"></span>
      </div>
    `;
    document.body.appendChild(loadingScreen);

    if (pollId) clearInterval(pollId);

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
