/**
 * recents.js - Gerencia a página de processamentos recentes (Versão Local)
 */

const API_BASE = '';

// Inicializa a página
async function init() {
  // Carrega navbar
  await loadNavbar();

  // Carrega processamentos
  await loadProcessings();

  // Atualiza countdown a cada segundo
  setInterval(updateCountdowns, 1000);
}

// Carrega a navbar
async function loadNavbar() {
  try {
    const response = await fetch('/html/navbar.html');
    if (response.ok) {
      const html = await response.text();
      document.getElementById('navbar-placeholder').innerHTML = html;
      
      // Inicializa a navbar (se houver script específico)
      if (window.initNavbar) {
        window.initNavbar();
      }
    }
  } catch (error) {
    console.error('Erro ao carregar navbar:', error);
  }
}

// Carrega os processamentos
async function loadProcessings() {
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('processing-grid');

  try {
    const response = await fetch(`${API_BASE}/api/recent-processings`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    loading.style.display = 'none';

    if (!data.processings || data.processings.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    // Renderiza os cards
    renderProcessings(data.processings);
    grid.style.display = 'grid';
    
  } catch (error) {
    console.error('❌ Erro ao carregar processamentos:', error);
    loading.style.display = 'none';
    emptyState.style.display = 'block';
    emptyState.querySelector('h2').textContent = 'Erro ao carregar processamentos';
    emptyState.querySelector('p').textContent = error.message || 'Tente novamente mais tarde.';
  }
}

// Renderiza os cards de processamento
function renderProcessings(processings) {
  const grid = document.getElementById('processing-grid');
  grid.innerHTML = '';

  processings.forEach(proc => {
    const card = createProcessingCard(proc);
    grid.appendChild(card);
  });
}

// Cria um card de processamento
function createProcessingCard(proc) {
  const card = document.createElement('div');
  card.className = 'processing-card';
  card.dataset.key = proc.key;
  card.dataset.expiresIn = proc.expiresIn;

  const maxTime = (24 * 60 * 60 * 1000); // 24h local version
  const expiresIn = proc.expiresIn || 0;
  const expirationPercent = Math.max(0, (expiresIn / maxTime) * 100);
  const timeRemaining = formatTimeRemaining(expiresIn);
  const isWarning = expiresIn < 20 * 60 * 1000;
  const isDanger = expiresIn < 5 * 60 * 1000;
  
  const preset = proc.preset || 'DESCONHECIDO';
  const displayName = proc.title || proc.fileName || proc.jobId;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">${displayName || proc.jobId}</div>
      <div class="card-preset">${preset}</div>
    </div>

    <div class="card-info">
      <div class="info-row">
        <span class="info-label">👤 Usuário:</span>
        <span class="info-value">Local User</span>
      </div>
      <div class="info-row">
        <span class="info-label">📦 Tamanho:</span>
        <span class="info-value">${formatFileSize(proc.size)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">📅 Criado em:</span>
        <span class="info-value">${formatDate(proc.createdAt)}</span>
      </div>
    </div>

    <div class="expiration-bar">
      <div class="expiration-progress" style="width: ${expirationPercent}%"></div>
    </div>
    
    <div class="expiration-time ${isDanger ? 'danger' : isWarning ? 'warning' : ''}" data-expires="${expiresIn}">
      🌟 Expira em: <strong>${timeRemaining}</strong>
    </div>

    <div class="card-actions">
      ${expiresIn > 0 ? `
        <button class="btn-play-card" onclick="playProcessing('${proc.key}')">
          ▶ Ouvir Agora
        </button>
        <a href="/api/download/${encodeURIComponent(proc.key)}" class="btn-download" download onclick="handleDownload(event, '${proc.key}', ${expiresIn})">
          📥 Download
        </a>
      ` : `
        <button class="btn-download expired" disabled>
          ⏰ Expirado
        </button>
      `}
      <button class="btn-delete" onclick="deleteProcessing('${proc.key}')">
        🗑️
      </button>
    </div>
  `;

  return card;
}

// Formata o tempo restante
function formatTimeRemaining(ms) {
  if (ms <= 0) return 'Expirado';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }
  
  if (minutes > 0) {
    const secs = seconds % 60;
    return `${minutes}min ${secs}s`;
  }
  
  return `${seconds}s`;
}

// Formata tamanho do arquivo
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// Formata data
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Atualiza os countdowns
function updateCountdowns() {
  const cards = document.querySelectorAll('.processing-card');
  
  cards.forEach(card => {
    const timeElement = card.querySelector('.expiration-time');
    const progressBar = card.querySelector('.expiration-progress');
    
    if (!timeElement) return;

    let expiresIn = parseInt(card.dataset.expiresIn);
    expiresIn -= 1000;
    
    if (expiresIn <= 0) {
      card.remove();
      
      const remainingCards = document.querySelectorAll('.processing-card');
      if (remainingCards.length === 0) {
        document.getElementById('processing-grid').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
      }
      return;
    }

    card.dataset.expiresIn = expiresIn;

    const timeText = timeElement.querySelector('strong');
    if (timeText) {
      timeText.textContent = formatTimeRemaining(expiresIn);
    }

    timeElement.classList.remove('warning', 'danger');
    if (expiresIn < 5 * 60 * 1000) {
      timeElement.classList.add('danger');
    } else if (expiresIn < 20 * 60 * 1000) {
      timeElement.classList.add('warning');
    }

    const expirationPercent = Math.max(0, (expiresIn / (24 * 60 * 60 * 1000)) * 100);
    if (progressBar) {
      progressBar.style.width = `${expirationPercent}%`;
    }
  });
}

// Handler para download com verificação de expiração
window.handleDownload = async function(e, key, expiresIn) {
  if (expiresIn <= 0) {
    e.preventDefault();
    alert('⏰ Este arquivo expirou e não está mais disponível para download.');
    return false;
  }
  
  const link = e.target.closest('a');
  if (!link) return;
  
  try {
    e.preventDefault();
    
    const response = await fetch(`/api/download/${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      let errorMessage = 'Erro ao baixar o arquivo';
      if (response.status === 404) errorMessage = 'Arquivo não encontrado ou já expirou no servidor';
      throw new Error(errorMessage);
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'audio.mp3';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch) filename = filenameMatch[1];
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    
  } catch (error) {
    console.error('Erro no download:', error);
    const errorMessage = error.message || 'Arquivo não disponível';
    
    if (errorMessage.includes('não encontrado') || errorMessage.includes('404')) {
      const card = document.querySelector(`[data-key="${key}"]`);
      if (card) {
        const downloadBtn = card.querySelector('.btn-download');
        if (downloadBtn) {
          downloadBtn.classList.add('expired');
          downloadBtn.disabled = true;
          downloadBtn.innerHTML = '⏰ Expirado';
          downloadBtn.onclick = null;
        }
      }
    }
    alert(`❌ Erro ao baixar arquivo: ${errorMessage}`);
  }
  
  return false;
};

// Deleta um processamento
window.deleteProcessing = async function(key) {
  if (!confirm('Tem certeza que deseja deletar este arquivo?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/r2-test/delete/${encodeURIComponent(key)}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const card = document.querySelector(`[data-key="${key}"]`);
    if (card) card.remove();

    const remainingCards = document.querySelectorAll('.processing-card');
    if (remainingCards.length === 0) {
      document.getElementById('processing-grid').style.display = 'none';
      document.getElementById('empty-state').style.display = 'block';
    }

  } catch (error) {
    console.error('❌ Erro ao deletar:', error);
    alert('Erro ao deletar o arquivo. Tente novamente.');
  }
};

// ==========================================
// PLAYER GLOBAL LOGIC
// ==========================================
let currentPlaylist = [];
let currentPlayIndex = -1;
let isPlaying = false;

window.playProcessing = function(key) {
  // Build playlist from current DOM cards to ensure order
  const cards = Array.from(document.querySelectorAll('.processing-card'));
  currentPlaylist = cards.map(c => {
    return {
      key: c.dataset.key,
      title: c.querySelector('.card-title').textContent,
      preset: c.querySelector('.card-preset').textContent,
      cardEl: c
    };
  });
  
  const index = currentPlaylist.findIndex(item => item.key === key);
  if (index !== -1) {
    playTrack(index);
  }
};

function playTrack(index) {
  if (index < 0 || index >= currentPlaylist.length) return;
  currentPlayIndex = index;
  const track = currentPlaylist[index];
  
  // Highlight active card
  document.querySelectorAll('.processing-card').forEach(c => c.classList.remove('playing'));
  document.querySelectorAll('.btn-play-card').forEach(btn => {
    btn.classList.remove('active');
    btn.innerHTML = '▶ Ouvir Agora';
  });
  
  track.cardEl.classList.add('playing');
  const btn = track.cardEl.querySelector('.btn-play-card');
  if (btn) {
    btn.classList.add('active');
    btn.innerHTML = '🔊 Tocando';
  }

  // Update UI
  const player = document.getElementById('globalPlayer');
  player.classList.add('active');
  
  document.getElementById('playerTitle').textContent = track.title;
  document.getElementById('playerPreset').textContent = track.preset;
  
  // Play Audio
  const audio = document.getElementById('globalAudioElement');
  audio.src = `/api/download/${encodeURIComponent(track.key)}`;
  audio.play()
    .then(() => {
      isPlaying = true;
      updatePlayPauseIcon();
    })
    .catch(err => {
      console.error("Erro ao tocar áudio:", err);
      alert("Erro ao tentar tocar esta música.");
    });
}

function togglePlay() {
  const audio = document.getElementById('globalAudioElement');
  if (!audio.src) return;
  
  if (isPlaying) {
    audio.pause();
    isPlaying = false;
  } else {
    audio.play();
    isPlaying = true;
  }
  updatePlayPauseIcon();
}

function playNext() {
  if (currentPlayIndex < currentPlaylist.length - 1) {
    playTrack(currentPlayIndex + 1);
  }
}

function playPrev() {
  if (currentPlayIndex > 0) {
    playTrack(currentPlayIndex - 1);
  }
}

function updatePlayPauseIcon() {
  const playIcon = document.querySelector('#playerPlayBtn .play-icon');
  const pauseIcon = document.querySelector('#playerPlayBtn .pause-icon');
  if (isPlaying) {
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  } else {
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  }
}

function formatPlayerTime(seconds) {
  if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Setup Player Listeners
document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('globalAudioElement');
  const progressBarBg = document.getElementById('playerProgressBarBg');
  const progressBarFill = document.getElementById('playerProgressBarFill');
  const currentTimeEl = document.getElementById('playerCurrentTime');
  const durationEl = document.getElementById('playerDuration');

  if (audio) {
    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const percent = (audio.currentTime / audio.duration) * 100;
      progressBarFill.style.width = `${percent}%`;
      currentTimeEl.textContent = formatPlayerTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatPlayerTime(audio.duration);
    });

    audio.addEventListener('ended', () => {
      playNext();
    });
  }

  if (progressBarBg) {
    progressBarBg.addEventListener('click', (e) => {
      if (!audio.duration) return;
      const rect = progressBarBg.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pos * audio.duration;
    });
  }

  const playBtn = document.getElementById('playerPlayBtn');
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  
  const nextBtn = document.getElementById('playerNextBtn');
  if (nextBtn) nextBtn.addEventListener('click', playNext);
  
  const prevBtn = document.getElementById('playerPrevBtn');
  if (prevBtn) prevBtn.addEventListener('click', playPrev);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
