// ===== PROTEÇÃO DE AUTENTICAÇÃO =====
// Verificar se usuário está logado antes de permitir acesso à página
(function checkAuth() {
  try {
    // Verificar token no localStorage (chave usada pelo session.js)
    const token = localStorage.getItem('phona:token');
    const userJson = localStorage.getItem('phona:user');
    
    if (!token || !userJson) {
      console.warn('⚠️ Usuário não autenticado - redirecionando para landing page');
      window.location.href = '/?requireAuth=true';
      return;
    }
    
    const user = JSON.parse(userJson);
    
    if (!user.email) {
      console.warn('⚠️ Sessão inválida - redirecionando para landing page');
      localStorage.removeItem('phona:token');
      localStorage.removeItem('phona:user');
      window.location.href = '/?requireAuth=true';
      return;
    }
    
    console.log('✅ Autenticação verificada:', user.email);
  } catch (error) {
    console.error('❌ Erro ao verificar autenticação:', error);
    window.location.href = '/?requireAuth=true';
    return;
  }
})();

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
  // ===== LÓGICA ROBUSTA DE CARREGAMENTO DE THUMBNAIL =====
  // Estratégia em camadas:
  // 1. Usa URL confirmada no sessionStorage (se existir e ainda não falhou)
  // 2. Faz uma chamada imediata única ao /status/:id para obter videoId (antes do polling)
  // 3. Executa uma cadeia de tentativas de thumbnail: maxresdefault -> hqdefault -> mqdefault -> default
  // 4. Se uma carregar, salva no sessionStorage como "confirmedThumbUrl" para futuras páginas
  // 5. Polling subsequente só tenta thumbnail se nenhuma estiver aplicada

  const confirmedThumbUrl = sessionStorage.getItem("confirmedThumbUrl");
  const prefetchedThumbUrl = sessionStorage.getItem("prefetchedThumbUrl"); // pode ter vindo da landing
  let videoIdFromStatus = null;
  let thumbResolved = false;

  // Helper para testar se uma imagem carrega
  function attemptImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = reject;
      img.src = url;
    });
  }

  // Função para carregar thumbnail com fallback em cadeia
  async function loadThumbnailChain(videoId, preferred) {
    if (!videoId) return;
    if (thumbResolved) return;

    const variants = [];
    // Se houver uma preferida (ex: maxres já testada na landing), tentar primeiro
    if (preferred) variants.push(preferred);
    const base = `https://i.ytimg.com/vi/${videoId}`;
    const ordered = ["maxresdefault.jpg", "hqdefault.jpg", "mqdefault.jpg", "default.jpg"]
      .map((f) => `${base}/${f}`);
    for (const url of ordered) {
      if (!variants.includes(url)) variants.push(url);
    }

    console.log("🔁 Thumbnail chain order:", variants);

    for (const url of variants) {
      try {
        const okUrl = await attemptImage(url);
        if (thumbnail && !thumbResolved) {
          thumbnail.src = okUrl;
          thumbnail.classList.remove("loading-placeholder");
          // decode() melhora o paint em alguns browsers
          if (thumbnail.decode) {
            try { await thumbnail.decode(); } catch (_) {}
          }
          thumbResolved = true;
          sessionStorage.setItem("confirmedThumbUrl", okUrl);
          console.log("✅ Thumbnail loaded and confirmed:", okUrl);
          break;
        }
      } catch (err) {
        console.warn("⚠️ Falhou thumb:", url);
      }
    }
  }

  async function bootstrapVideoIdAndThumb() {
    // 1. Se já temos uma confirmada, aplica e sai
    if (confirmedThumbUrl && thumbnail) {
      thumbnail.src = confirmedThumbUrl;
      thumbnail.classList.remove("loading-placeholder");
      thumbResolved = true;
      console.log("✅ Using confirmedThumbUrl from session:", confirmedThumbUrl);
      return;
    }

    // 2. Se temos apenas prefetched (não confirmada), aplica provisoriamente e continua a cadeia para validar
    if (!thumbResolved && prefetchedThumbUrl && thumbnail) {
      thumbnail.src = prefetchedThumbUrl;
      thumbnail.classList.remove("loading-placeholder");
      console.log("🕒 Applying prefetched thumbnail provisional:", prefetchedThumbUrl);
      // Não marca como resolvida; cadeia pode substituir se falhar
      thumbnail.onerror = () => {
        console.warn("Prefetched thumbnail falhou – continuará cadeia de fallback");
        thumbnail.classList.add("loading-placeholder");
      };
    }

    // 3. Chamada única imediata ao status para antecipar videoId
    try {
      const token = localStorage.getItem('phona:token');
      const quick = await fetch(`/status/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (quick.ok) {
        const data = await quick.json();
        videoIdFromStatus = data.videoId || (data.metadata ? (function(){
          try { return new URL(data.metadata.youtubeUrl).searchParams.get("v") || data.metadata.youtubeUrl.split("youtu.be/")[1]?.split("?")[0]; } catch(e){ return null; }
        })() : null);
        console.log("🎬 Early status videoId:", videoIdFromStatus);
        // Dispara cadeia
        loadThumbnailChain(videoIdFromStatus, prefetchedThumbUrl);
      } else {
        console.warn("Status inicial falhou, dependerá do polling para videoId");
      }
    } catch (err) {
      console.warn("Erro ao obter status inicial:", err);
    }
  }

  bootstrapVideoIdAndThumb();

  // ===== START POLL =====
  // Função de polling para status do job
  function startPoll(id, onFirstStatus) {
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

    let thumbPreloaded = !!sessionStorage.getItem("confirmedThumbUrl");

    pollId = setInterval(async () => {
      try {
        const token = localStorage.getItem('phona:token');
        const statusUrl = `/status/${id}`;
        const r = await fetch(statusUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!r.ok) throw new Error("status fetch failed");
        const j = await r.json();

        // Thumbnail (caso cadeia inicial não tenha resolvido e ainda sem src válido)
        if (!thumbPreloaded && !thumbnail.src) {
          let videoId = j.videoId;
          if (!videoId && j.metadata?.youtubeUrl) {
            videoId = extractVideoId(j.metadata.youtubeUrl);
          }
          if (videoId) {
            console.log("📸 Poll fallback initiating chain for videoId:", videoId);
            loadThumbnailChain(videoId, sessionStorage.getItem("prefetchedThumbUrl"));
            thumbPreloaded = true;
          }
        }

        if (onFirstStatus) {
          onFirstStatus(j);
          onFirstStatus = null; // dispara só uma vez
        }

        // Barra de PROCESSAMENTO (só enquanto não terminou)
        if (j.progress !== lastProgress && j.status !== "DONE") {
          if (processBarInner) {
            processBarInner.style.width = j.progress + "%";
          }

          let statusMessage = "";
          if (j.progress < 20) statusMessage = "Baixando áudio...";
          else if (j.progress < 40) statusMessage = "Extraindo faixas...";
          else if (j.progress < 60) statusMessage = "Aplicando efeitos...";
          else if (j.progress < 80) statusMessage = "Renderizando...";
          else statusMessage = "Finalizando...";

          if (statusText) statusText.textContent = statusMessage;
          lastProgress = j.progress;
        }

        // Status e label
        if (statusBadge) statusBadge.textContent = j.status;
        if (statusLabel) statusLabel.textContent = getStatusLabel(j.status);

        // Título
        if (j.videoTitle && titleEl) {
          titleEl.textContent = j.videoTitle;
        }

        // Finalizado
        if (j.status === "DONE") {
          clearInterval(pollId);
          pollId = null;

          if (processBarInner) processBarInner.style.width = "100%";
          if (statusText) statusText.textContent = "Processamento concluído!";

          if (j.output) {
            const downloadUrl = j.output;
            if (downloadLink) {
              downloadLink.href = downloadUrl;
              downloadLink.style.display = "flex";
            }
            if (audioPreview) {
              audioPreview.src = downloadUrl;
              audioPreview.style.display = "block";
              showPlayer();
            }
          }
        }

        // Erro
        if (j.status === "ERROR") {
          clearInterval(pollId);
          pollId = null;
          showError(j.error || "Erro desconhecido durante o processamento.");
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 1500);
  }

  // Iniciar polling normal (também servirá como segunda chance para conseguir videoId se falhou antes)
  startPoll(jobId, () => {
    // callback opcional: se videoId ainda não e nem thumbnail confirmada, tentar de novo extração na primeira resposta
    if (!thumbResolved && videoIdFromStatus) return; // já em andamento
  });
}

// ===== HELPER FUNCTIONS =====

// Traduzir status para label amigável
function getStatusLabel(status) {
  const labels = {
    'PENDING': 'Aguardando',
    'PROCESSING': 'Processando',
    'DONE': 'Concluído',
    'ERROR': 'Erro'
  };
  return labels[status] || status;
}

// ===== ERROR HANDLER =====
function showError(message) {
  if (errorMsg) {
    errorMsg.textContent = message;
    errorMsg.classList.remove("hidden");
    errorMsg.style.display = "block";
  }
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
