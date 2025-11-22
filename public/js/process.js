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

// Verificar autenticação
const token = localStorage.getItem('phona:token');
if (!token) {
  console.warn('⚠️ [PROCESS] Usuário não autenticado, redirecionando...');
  window.location.href = '/html/login.html?redirect=' + encodeURIComponent(window.location.pathname + window.location.search);
}

// Obter ID do job da URL
const params = new URLSearchParams(window.location.search);
const jobId = params.get("id");

console.log("Job ID:", jobId);
console.log("🔐 [PROCESS] Token presente:", !!token);

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

// Cleanup
window.addEventListener("beforeunload", () => {
  if (pollId) clearInterval(pollId);
  
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
      // Obter token do localStorage
      const token = localStorage.getItem('phona:token');
      
      const statusUrl = `/status/${id}`;
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const r = await fetch(statusUrl, { headers });
      if (!r.ok) {
        if (r.status === 401) {
          clearInterval(pollId);
          showError("Sessão expirada. Por favor, faça login novamente.");
          setTimeout(() => {
            window.location.href = '/html/login.html';
          }, 2000);
          return;
        }
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

      // Carregar título
      if (j.title && titleEl.textContent === "Processando...") {
        titleEl.textContent = j.title;
      }

      // Job concluído
      if (j.status === "DONE") {
        clearInterval(pollId);
        statusText.textContent = "Concluído";
        if (progressPercent) {
          progressPercent.textContent = "100%";
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

        // Usar rota /file/:id que tem autenticação no backend
        const downloadName = j.filename || j.title || `audio_${id}.mp3`;

        console.log("Loading audio with authentication...");

        // Carregar áudio com autenticação via fetch e criar blob URL
        loadAudioWithAuth(id, downloadName);
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

async function loadAudioWithAuth(jobId, downloadName) {
  try {
    const token = localStorage.getItem('phona:token');
    const audioUrl = `/file/${jobId}`;
    
    console.log("Fetching audio from:", audioUrl);
    
    // Fetch com autenticação
    const response = await fetch(audioUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log("Audio fetched successfully, creating blob...");
    
    // Criar blob do áudio
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    console.log("Blob URL created:", blobUrl);
    
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
      
      audioPreview.oncanplay = () => {
        console.log("Audio ready to play");
      };
      
      audioPreview.onerror = (e) => {
        console.error("Audio error:", e);
        showError("Erro ao reproduzir áudio.");
      };
      
      audioPreview.onloadeddata = () => {
        console.log("Audio data loaded successfully");
      };
    }, 100);
    
    // Configurar botão de download
    downloadLink.href = blobUrl;
    downloadLink.download = downloadName;
    downloadLink.classList.remove("hidden");
    downloadLink.textContent = "Baixar Áudio";
    
    console.log("Audio and download configured");
    
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
