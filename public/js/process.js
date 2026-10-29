// DOM Elements
const barInner = document.getElementById("barInner");
const statusText = document.getElementById("statusText");
const titleEl = document.getElementById("title");
const thumbnail = document.getElementById("thumbnail");
const downloadLink = document.getElementById("downloadLink");
const audioPreview = document.getElementById("audioPreview");
const errorMsg = document.getElementById("errorMsg");
const progressPercent = document.getElementById("progressPercent");
const vinylDisc = document.querySelector(".vinyl-disc");

// Custom Player Elements
const playBtn = document.getElementById("playBtn");
const playIcon = playBtn?.querySelector(".play-icon");
const pauseIcon = playBtn?.querySelector(".pause-icon");
const currentTimeEl = document.getElementById("currentTime");
const durationEl = document.getElementById("duration");
const playerProgressBar = document.getElementById("playerProgressBar");

let pollId = null;
let lastProgress = -1;

initializeProcessPage();

async function loadNavbar() {
  try {
    const response = await fetch('/html/navbar.html');
    if (response.ok) {
      const html = await response.text();
      const placeholder = document.getElementById('navbar-placeholder');
      if (placeholder) {
        placeholder.innerHTML = html;
        if (window.initNavbar) {
          window.initNavbar();
        }
      }
    }
  } catch (error) {
    console.error('Erro ao carregar navbar:', error);
  }
}

function initializeProcessPage() {
  loadNavbar();
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get("id");

  if (!jobId) {
    showError("Job ID não encontrado. Retorne ao início.");
    return;
  }

  const prefetchedThumbUrl = sessionStorage.getItem("prefetchedThumbUrl");
  if (prefetchedThumbUrl) {
    thumbnail.src = prefetchedThumbUrl;
    thumbnail.classList.remove("loading-placeholder");
  }

  const generateVideoBtn = document.getElementById("generateVideoBtn");
  if (generateVideoBtn) {
    generateVideoBtn.addEventListener("click", async () => {
      try {
        generateVideoBtn.disabled = true;
        const res = await fetch(`/api/process/${jobId}/video`, { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro ao iniciar vídeo");
      } catch (err) {
        showError("❌ " + err.message);
        generateVideoBtn.disabled = false;
      }
    });
  }

  startPoll(jobId);
}

// Cleanup
window.addEventListener("beforeunload", () => {
  if (pollId) clearInterval(pollId);
  if (expirationCountdownInterval) clearInterval(expirationCountdownInterval);

  // Limpar blob URLs para liberar memória
  if (audioPreview.src && audioPreview.src.startsWith('blob:')) {
    URL.revokeObjectURL(audioPreview.src);
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
      
      if (!r.ok) {
        throw new Error("status fetch failed");
      }
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
        if (progressPercent) {
          progressPercent.textContent = `${j.progress}%`;
        }
        statusText.textContent = j.status || "Processando...";
        lastProgress = j.progress;
      }

      // Carregar título (substituir placeholders)
      if (j.title && (titleEl.textContent === "Processando..." || titleEl.textContent === "Criando seu remix...")) {
        titleEl.textContent = j.title;
      }

      // Job concluído
      if (j.status === "DONE") {
        clearInterval(pollId);
        statusText.textContent = "Concluído";
        if (progressPercent) {
          progressPercent.textContent = "100%";
        }

        // Garantir que o título está correto
        if (j.title) {
          titleEl.textContent = j.title;
        }

        // Usar nome formatado do backend ou gerar localmente
        const downloadName = j.downloadFilename || j.filename || generateDownloadFilename(j.title, j.preset || 'custom');

        // Carregar áudio
        loadAudio(id, downloadName, j.expiresIn, j.isExpired);

        // Iniciar countdown de expiração se houver tempo restante
        if (j.expiresIn !== undefined) {
          startExpirationCountdown(j.expiresIn, j.isExpired);
        }
      }

      // Erro no processamento
      if (j.status === "ERROR") {
        clearInterval(pollId);
        const errorText = j.error || "processing failed";
        showError("❌ Erro: " + errorText);
        statusText.textContent = "Erro ao processar";
      }

      // Video Status updates
      if (j.status === "DONE") {
        const videoSection = document.getElementById("videoSection");
        const generateVideoBtn = document.getElementById("generateVideoBtn");
        const downloadVideoLink = document.getElementById("downloadVideoLink");
        const videoProgressWrapper = document.getElementById("videoProgressWrapper");
        const videoBarInner = document.getElementById("videoBarInner");
        const videoStatusText = document.getElementById("videoStatusText");
        const videoProgressPercent = document.getElementById("videoProgressPercent");
        const videoErrorMsg = document.getElementById("videoErrorMsg");

        videoSection.classList.remove("hidden");

        if (!j.videoStatus || j.videoStatus === "PENDING") {
          generateVideoBtn.classList.remove("hidden");
          downloadVideoLink.classList.add("hidden");
          videoProgressWrapper.classList.add("hidden");
        } else if (j.videoStatus === "PROCESSING") {
          generateVideoBtn.classList.add("hidden");
          downloadVideoLink.classList.add("hidden");
          videoProgressWrapper.classList.remove("hidden");
          
          const vProg = j.videoProgress || 0;
          videoBarInner.style.width = vProg + "%";
          videoProgressPercent.textContent = vProg + "%";
          videoStatusText.textContent = "Renderizando Vídeo...";
        } else if (j.videoStatus === "DONE") {
          generateVideoBtn.classList.add("hidden");
          videoProgressWrapper.classList.add("hidden");
          downloadVideoLink.classList.remove("hidden");
          
          const videoName = j.filename ? j.filename.replace('.mp3', '_tiktok.mp4') : `${j.id}_tiktok.mp4`;
          downloadVideoLink.href = `/file/${id}/video`;
          downloadVideoLink.download = videoName;
        } else if (j.videoStatus === "ERROR") {
          generateVideoBtn.classList.remove("hidden");
          videoProgressWrapper.classList.add("hidden");
          videoErrorMsg.classList.remove("hidden");
          videoErrorMsg.textContent = "❌ " + (j.videoError || "Erro ao renderizar vídeo");
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      // Não limpar em erro, tentar novamente
    }
  }, 500); // Reduzido de 1000ms para 500ms - mais responsivo
}

let expirationCountdownInterval = null;

/**
 * Gera nome de arquivo formatado: nomedamusica-presetaplicado-diadoprocessamento.mp3
 */
function generateDownloadFilename(title, preset) {
  // Sanitiza o título da música
  let musicName = 'audio';
  if (title) {
    musicName = title
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífen
      .toLowerCase()
      .substring(0, 50) // Limita tamanho
      .trim();

    if (!musicName || musicName === '') {
      musicName = 'audio';
    }
  }

  // Preset aplicado
  const presetFormatted = (preset || 'custom').toLowerCase().replace(/\s+/g, '-');

  // Data do processamento (formato: YYYYMMDD)
  const processDate = new Date().toISOString().split('T')[0].replace(/-/g, '');

  return `${musicName}-${presetFormatted}-${processDate}.mp3`;
}

function startExpirationCountdown(expiresInMs, isExpired) {
  if (expirationCountdownInterval) {
    clearInterval(expirationCountdownInterval);
  }

  if (isExpired) {
    handleExpiration();
    return;
  }

  let remainingMs = expiresInMs;

  // Criar e exibir aviso inicialmente
  updateExpirationDisplay(remainingMs);

  expirationCountdownInterval = setInterval(() => {
    remainingMs -= 1000;

    if (remainingMs <= 0) {
      clearInterval(expirationCountdownInterval);
      handleExpiration();
      return;
    }

    // Atualizar visual do tempo restante
    updateExpirationDisplay(remainingMs);
  }, 1000);
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expirado';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

function updateExpirationDisplay(remainingMs) {
  // Adicionar elemento de aviso de expiração se não existir
  let expirationWarning = document.getElementById('expiration-warning');
  if (!expirationWarning) {
    expirationWarning = document.createElement('div');
    expirationWarning.id = 'expiration-warning';
    expirationWarning.className = 'expiration-warning';

    const infoSection = document.querySelector('.info-section');
    if (infoSection) {
      // Inserir após o header de música
      const musicHeader = infoSection.querySelector('.music-header');
      if (musicHeader && musicHeader.nextSibling) {
        infoSection.insertBefore(expirationWarning, musicHeader.nextSibling);
      } else {
        infoSection.insertBefore(expirationWarning, infoSection.firstChild.nextSibling);
      }
    }
  }

  if (expirationWarning) {
    const timeStr = formatTimeRemaining(remainingMs);
    const isWarning = remainingMs < 20 * 60 * 1000; // menos de 20 min
    const isDanger = remainingMs < 5 * 60 * 1000; // menos de 5 min

    expirationWarning.className = 'expiration-warning active' +
      (isDanger ? ' danger' : isWarning ? ' warning' : '');
    expirationWarning.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>🌟 Expira em: <strong>${timeStr}</strong></span>
    `;
  }
}

function handleExpiration() {
  // Desabilitar download
  const downloadLink = document.getElementById('downloadLink');
  if (downloadLink) {
    downloadLink.classList.add('expired');
    downloadLink.style.pointerEvents = 'none';
    downloadLink.style.opacity = '0.5';
    downloadLink.textContent = '⏰ Download Expirado';
  }

  // Mostrar aviso de expiração
  let expirationWarning = document.getElementById('expiration-warning');
  if (!expirationWarning) {
    expirationWarning = document.createElement('div');
    expirationWarning.id = 'expiration-warning';
    expirationWarning.className = 'expiration-warning expired-alert';

    const infoSection = document.querySelector('.info-section');
    if (infoSection) {
      infoSection.insertBefore(expirationWarning, infoSection.firstChild.nextSibling);
    }
  }

  expirationWarning.className = 'expiration-warning expired-alert';
  expirationWarning.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <span><strong>⚠️ Download Expirado</strong> - O arquivo não está mais disponível</span>
  `;

  // Atualizar status
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = 'Expirado';
  }

  // Pausar áudio se estiver tocando
  const audioPreview = document.getElementById('audioPreview');
  if (audioPreview) {
    audioPreview.pause();
  }
}

async function loadAudio(jobId, downloadName, expiresInMs, isExpired) {
  try {
    const audioUrl = `/file/${jobId}`;

    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Criar blob do áudio
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    // Limpar áudio anterior e suas URLs
    if (audioPreview.src && audioPreview.src.startsWith('blob:')) {
      URL.revokeObjectURL(audioPreview.src);
    }

    audioPreview.pause();
    audioPreview.src = "";
    audioPreview.load();

    // Configurar novo áudio
    setTimeout(() => {
      audioPreview.src = blobUrl;
      audioPreview.load();

      audioPreview.onerror = (e) => {
        console.error("Audio error:", e);
        showError("Erro ao reproduzir áudio.");
      };
    }, 100);

    // Configurar botão de download (só se não estiver expirado)
    if (isExpired) {
      handleExpiration();
    } else {
      downloadLink.href = blobUrl;
      downloadLink.download = downloadName;
      downloadLink.classList.remove("hidden");
      downloadLink.classList.remove("expired");
      downloadLink.style.pointerEvents = 'auto';
      downloadLink.style.opacity = '1';
      downloadLink.textContent = "Baixar Áudio";
      downloadLink.onclick = (e) => {
        // Verificar novamente antes de permitir download (se tiver timer)
        if (expiresInMs !== undefined && expiresInMs <= 0) {
          e.preventDefault();
          handleExpiration();
          return false;
        }
      };
    }

  } catch (err) {
    console.error("Error loading audio:", err);
    showError("Erro ao carregar áudio: " + err.message);
  }
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

// ============ CUSTOM AUDIO PLAYER ============
function initCustomPlayer() {
  if (!audioPreview || !playBtn) return;

  // Desabilitar player inicialmente
  playBtn.disabled = true;
  playBtn.style.opacity = "0.5";
  playBtn.style.cursor = "not-allowed";

  // Format time helper
  function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // Play/Pause toggle
  playBtn.addEventListener("click", () => {
    if (playBtn.disabled) return;
    if (audioPreview.paused) {
      audioPreview.play().catch(err => {
        console.error("Error playing audio:", err);
      });
    } else {
      audioPreview.pause();
    }
  });

  // Update play/pause icon and vinyl spinning
  audioPreview.addEventListener("play", () => {
    if (playIcon) playIcon.classList.add("hidden");
    if (pauseIcon) pauseIcon.classList.remove("hidden");
    if (vinylDisc) vinylDisc.classList.add("spinning");
  });

  audioPreview.addEventListener("pause", () => {
    if (playIcon) playIcon.classList.remove("hidden");
    if (pauseIcon) pauseIcon.classList.add("hidden");
    if (vinylDisc) vinylDisc.classList.remove("spinning");
  });

  // Update time and progress
  audioPreview.addEventListener("timeupdate", () => {
    if (currentTimeEl) {
      currentTimeEl.textContent = formatTime(audioPreview.currentTime);
    }
    if (playerProgressBar) {
      const percent = (audioPreview.currentTime / audioPreview.duration) * 100;
      playerProgressBar.style.width = `${percent}%`;
    }
  });

  // Update duration when metadata loads
  audioPreview.addEventListener("loadedmetadata", () => {
    if (durationEl) {
      durationEl.textContent = formatTime(audioPreview.duration);
    }
  });

  // Habilitar player quando áudio estiver pronto
  audioPreview.addEventListener("canplay", () => {
    playBtn.disabled = false;
    playBtn.style.opacity = "1";
    playBtn.style.cursor = "pointer";
  });

  // Desabilitar se houver erro
  audioPreview.addEventListener("error", () => {
    playBtn.disabled = true;
    playBtn.style.opacity = "0.5";
    playBtn.style.cursor = "not-allowed";
  });

  // Seek functionality
  const playerProgress = document.querySelector(".player-progress");
  if (playerProgress) {
    playerProgress.addEventListener("click", (e) => {
      if (playBtn.disabled || !audioPreview.duration) return;
      const rect = playerProgress.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      audioPreview.currentTime = percent * audioPreview.duration;
    });
  }
}

// Initialize player when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCustomPlayer);
} else {
  initCustomPlayer();
}
