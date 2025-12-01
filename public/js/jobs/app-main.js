/**
 * PHONA App Main
 * Controlador principal da página de processamento
 */

import { requireAuth, redirectToDownload } from '../router.js';
import { getUser, getUserInitial, clearSession } from '../auth/session.js';
import { apiCreateJob, pollJobStatus, getErrorMessage } from '../api.js';
import { $, getValue, disable, enable, addClass, removeClass } from '../utils/dom.js';
import { setLocal } from '../utils/storage.js';

// Proteção de rota
if (!requireAuth()) {
  throw new Error('Unauthorized');
}

// Presets disponíveis (mesmos do backend)
const PRESETS = {
  SLOWED: {
    id: 'SLOWED',
    name: 'Slowed',
    icon: '🕐',
    description: 'Tempo 0.75× preservando o pitch',
  },
  SPEED_125: {
    id: 'SPEED_125',
    name: 'Speed Up',
    icon: '⚡',
    description: '1.5× velocidade com pitch preservado',
  },
  NIGHTCORE: {
    id: 'NIGHTCORE',
    name: 'Nightcore',
    icon: '🌟',
    description: 'Rápido + pitch agudo (1.25×) energético',
  },
  DAYCORE: {
    id: 'DAYCORE',
    name: 'Daycore',
    icon: '☀️',
    description: 'Lento + pitch grave (0.80×) melancólico',
  },
  MUFFLED_SLOWED: {
    id: 'MUFFLED_SLOWED',
    name: 'Muffled Slowed',
    icon: '🔇',
    description: 'Lento abafado com lowpass 3000Hz',
  },
  MUFFLED_SPEED: {
    id: 'MUFFLED_SPEED',
    name: 'Muffled Speed',
    icon: '🔊',
    description: 'Rápido abafado com lowpass 3000Hz',
  },
  PHONA: {
    id: 'PHONA',
    name: 'Phona',
    icon: '📞',
    description: 'Efeito telefone (300Hz-3400Hz)',
  },
  ECHO: {
    id: 'ECHO',
    name: 'Echo',
    icon: '🔉',
    description: 'Eco clássico com delay 800ms',
  },
  REVERB: {
    id: 'REVERB',
    name: 'Reverb',
    icon: '🎵',
    description: 'Reverberação atmosférica espacial',
  },
  BASS_BOOST: {
    id: 'BASS_BOOST',
    name: 'Bass Boost',
    icon: '🎸',
    description: 'Graves potentes +8dB sem distorção',
  },
  ROBOT_VOICE: {
    id: 'ROBOT_VOICE',
    name: 'Robot Voice',
    icon: '🤖',
    description: 'Voz robótica metálica sintética',
  },
  '8D': {
    id: '8D',
    name: '8D',
    icon: '🎧',
    description: 'Som girando 360° na cabeça',
  },
};

// Elementos
const form = $('#processorForm');
const audioUrlInput = $('#audioUrl');
const presetGrid = $('#presetGrid');
const processBtn = $('#processBtn');
const processBtnText = $('#processBtnText');
const processBtnIcon = $('#processBtnIcon');
const processBtnSpinner = $('#processBtnSpinner');

const statusArea = $('#statusArea');
const statusIcon = $('#statusIcon');
const statusTitle = $('#statusTitle');
const statusMessage = $('#statusMessage');
const progressBar = $('#progressBar');
const progressFill = $('#progressFill');
const progressText = $('#progressText');
const statusActions = $('#statusActions');

const userAvatar = $('#userAvatar');
const userName = $('#userName');
const logoutBtn = $('#logoutBtn');

// Estado
let selectedPreset = null;
let currentJobId = null;

/**
 * Renderizar presets
 */
function renderPresets() {
  if (!presetGrid) return;

  const presetsHtml = Object.values(PRESETS).map(preset => `
    <label class="preset-card">
      <input 
        type="radio" 
        name="preset" 
        value="${preset.id}"
        data-preset="${preset.id}"
      >
      <div class="preset-icon">${preset.icon}</div>
      <div class="preset-name">${preset.name}</div>
      <div class="preset-description">${preset.description}</div>
    </label>
  `).join('');

  presetGrid.innerHTML = presetsHtml;

  // Event listeners para seleção
  const presetInputs = presetGrid.querySelectorAll('input[type="radio"]');
  presetInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      selectedPreset = e.target.value;

      // Atualizar visual
      presetGrid.querySelectorAll('.preset-card').forEach(card => {
        removeClass(card, 'selected');
      });
      addClass(e.target.closest('.preset-card'), 'selected');
    });
  });
}

/**
 * Atualizar informações do usuário
 */
function updateUserInfo() {
  const user = getUser();
  if (!user) return;

  if (userAvatar) {
    userAvatar.textContent = getUserInitial();
  }

  if (userName) {
    userName.textContent = user.username;
  }
}

/**
 * Logout
 */
function handleLogout() {
  clearSession();
  // Redirecionar para landing page após logout
  window.location.href = '/';
}

/**
 * Validar formulário
 */
function validateForm(url, preset) {
  if (!url) {
    alert('Por favor, insira o link do YouTube');
    audioUrlInput.focus();
    return false;
  }

  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    alert('Por favor, insira um link válido do YouTube');
    audioUrlInput.focus();
    return false;
  }

  if (!preset) {
    alert('Por favor, selecione um efeito');
    return false;
  }

  return true;
}

/**
 * Mostrar status area
 */
function showStatus() {
  if (!statusArea) return;
  addClass(statusArea, 'active');
  statusArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Atualizar status
 */
function updateStatus(config) {
  const {
    icon = '🎵',
    iconClass = 'loading',
    title = 'Processando...',
    message = '',
    progress = 0,
    showProgress = true,
    actions = null,
  } = config;

  if (statusIcon) {
    statusIcon.textContent = icon;
    statusIcon.className = 'status-icon ' + iconClass;
  }

  if (statusTitle) {
    statusTitle.textContent = title;
  }

  if (statusMessage) {
    statusMessage.textContent = message;
  }

  if (progressBar) {
    progressBar.style.display = showProgress ? 'block' : 'none';
  }

  if (progressFill && showProgress) {
    progressFill.style.width = `${progress}%`;
  }

  if (progressText && showProgress) {
    progressText.textContent = `${progress}%`;
  }

  if (statusActions) {
    if (actions) {
      statusActions.innerHTML = actions;
      statusActions.style.display = 'flex';
      statusActions.style.flexDirection = 'column';
      statusActions.style.gap = 'var(--space-sm)';
    } else {
      statusActions.style.display = 'none';
      statusActions.innerHTML = '';
    }
  }
}

/**
 * Processar job
 */
async function handleProcess(e) {
  e.preventDefault();

  const url = getValue(audioUrlInput);
  const preset = selectedPreset;

  if (!validateForm(url, preset)) {
    return;
  }

  // Desabilitar form
  disable(processBtn);
  processBtnText.style.display = 'none';
  processBtnIcon.style.display = 'none';
  processBtnSpinner.style.display = 'inline-block';

  try {
    // Criar job
    updateStatus({
      icon: '📤',
      iconClass: 'loading',
      title: 'Enviando...',
      message: 'Criando job de processamento',
      progress: 10,
    });

    showStatus();

    const response = await apiCreateJob({
      inputUrl: url,
      preset: preset,
    });

    currentJobId = response.jobId;

    // Iniciar polling
    updateStatus({
      icon: '⚙️',
      iconClass: 'loading',
      title: 'Processando...',
      message: 'Seu áudio está sendo processado',
      progress: 20,
    });

    await pollJobStatus(currentJobId, (status) => {
      // Atualizar progresso baseado no status
      let progress = status.progress || 20;
      let message = 'Processando áudio...';

      if (status.status === 'WAITING') {
        progress = 25;
        message = 'Aguardando na fila...';
      } else if (status.status === 'PROCESSING') {
        progress = Math.min(progress, 90);
        message = 'Aplicando efeitos de áudio...';
      }

      updateStatus({
        icon: '⚙️',
        iconClass: 'loading',
        title: 'Processando...',
        message: message,
        progress: progress,
      });
    });

    // Job concluído
    const presetName = PRESETS[preset]?.name || preset;

    updateStatus({
      icon: '✅',
      iconClass: 'success',
      title: 'Pronto!',
      message: `Seu áudio com efeito ${presetName} está pronto para download`,
      progress: 100,
      showProgress: false,
      actions: `
        <button class="btn btn-primary btn-lg" onclick="window.handleDownload()">
          Baixar áudio
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="btn btn-secondary" onclick="window.handleNewProcess()">
          Processar outro áudio
        </button>
      `,
    });

    // Salvar job no localStorage para plano Free
    saveJobForDownload(currentJobId, url, preset, presetName);

  } catch (error) {
    console.error('Process error:', error);

    updateStatus({
      icon: '❌',
      iconClass: 'error',
      title: 'Erro no processamento',
      message: getErrorMessage(error),
      showProgress: false,
      actions: `
        <button class="btn btn-primary" onclick="window.handleNewProcess()">
          Tentar novamente
        </button>
      `,
    });
  }
}

/**
 * Salvar job para download (plano Free)
 */
function saveJobForDownload(jobId, url, preset, presetName) {
  const downloadJob = {
    jobId,
    url,
    preset,
    presetName,
    fileName: `phona_${presetName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.mp3`,
    downloadUrl: `/api/jobs/${jobId}/download`,
    createdAt: new Date().toISOString(),
  };

  setLocal('phona:free:downloadJob', downloadJob);
}

/**
 * Ir para download
 */
window.handleDownload = function () {
  redirectToDownload();
};

/**
 * Novo processamento
 */
window.handleNewProcess = function () {
  // Limpar form
  audioUrlInput.value = '';
  selectedPreset = null;
  currentJobId = null;

  // Remover seleção de presets
  presetGrid.querySelectorAll('.preset-card').forEach(card => {
    removeClass(card, 'selected');
  });

  presetGrid.querySelectorAll('input[type="radio"]').forEach(input => {
    input.checked = false;
  });

  // Esconder status
  removeClass(statusArea, 'active');

  // Habilitar form
  enable(processBtn);
  processBtnText.style.display = 'inline';
  processBtnIcon.style.display = 'inline';
  processBtnSpinner.style.display = 'none';

  // Focar no input
  audioUrlInput.focus();

  // Scroll para o topo
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Inicializar
 */
function init() {
  updateUserInfo();
  renderPresets();

  // Event listeners
  if (form) {
    form.addEventListener('submit', handleProcess);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }

  // Focus no input
  audioUrlInput?.focus();
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
