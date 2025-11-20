/**
 * PHONA Download Page
 * Gerencia download de arquivos processados (plano Free)
 */

import { requireAuth, redirectToApp } from '../router.js';
import { getUser, getUserInitial, clearSession } from '../auth/session.js';
import { apiDeleteTempJob } from '../api.js';
import { $, show, hide } from '../utils/dom.js';
import { getLocal, removeLocal } from '../utils/storage.js';

// Proteção de rota
if (!requireAuth()) {
  throw new Error('Unauthorized');
}

// Elementos
const loadingState = $('#loadingState');
const downloadReadyState = $('#downloadReadyState');
const emptyState = $('#emptyState');

const presetIcon = $('#presetIcon');
const presetName = $('#presetName');
const fileName = $('#fileName');
const downloadBtn = $('#downloadBtn');
const backToAppBtn = $('#backToAppBtn');
const goToAppBtn = $('#goToAppBtn');

const userAvatar = $('#userAvatar');
const userName = $('#userName');
const logoutBtn = $('#logoutBtn');

// Estado
let currentJob = null;

// Mapeamento de ícones de preset
const PRESET_ICONS = {
  'SLOWED': '🕐',
  'SPEED_125': '⚡',
  'ULTRA_SLOWED': '🔄',
  'MUFFLED_SLOWED': '🔇',
  'MUFFLED_SPEED': '🔊',
  'DAYCORE': '☀️',
  'NIGHTCORE': '🌙',
  '8D': '🎧',
};

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
  // Limpar job antes de sair
  cleanupJob();
  clearSession();
  // Redirecionar para landing page após logout
  window.location.href = '/';
}

/**
 * Carregar job do localStorage
 */
function loadJob() {
  show(loadingState);
  hide(downloadReadyState);
  hide(emptyState);
  
  // Pequeno delay para efeito visual
  setTimeout(() => {
    const job = getLocal('phona:free:downloadJob');
    
    if (!job || !job.jobId) {
      showEmptyState();
      return;
    }
    
    currentJob = job;
    showDownloadReady();
  }, 500);
}

/**
 * Mostrar estado vazio
 */
function showEmptyState() {
  hide(loadingState);
  hide(downloadReadyState);
  show(emptyState);
}

/**
 * Mostrar download pronto
 */
function showDownloadReady() {
  hide(loadingState);
  hide(emptyState);
  show(downloadReadyState);
  
  // Preencher informações
  if (presetIcon && currentJob.preset) {
    presetIcon.textContent = PRESET_ICONS[currentJob.preset] || '🎵';
  }
  
  if (presetName && currentJob.presetName) {
    presetName.textContent = currentJob.presetName;
  }
  
  if (fileName && currentJob.fileName) {
    fileName.textContent = currentJob.fileName;
  }
  
  if (downloadBtn && currentJob.downloadUrl) {
    downloadBtn.href = currentJob.downloadUrl;
    downloadBtn.download = currentJob.fileName || 'phona_audio.mp3';
  }
}

/**
 * Limpar job (remover do localStorage e do servidor)
 */
async function cleanupJob() {
  if (!currentJob) {
    return;
  }
  
  // Remover do localStorage
  removeLocal('phona:free:downloadJob');
  
  // Tentar remover do servidor (opcional, sem bloquear)
  try {
    if (currentJob.jobId) {
      await apiDeleteTempJob(currentJob.jobId);
    }
  } catch (error) {
    console.warn('Failed to delete temp job:', error);
    // Não bloquear se falhar
  }
  
  currentJob = null;
}

/**
 * Voltar para app
 */
async function handleBackToApp() {
  await cleanupJob();
  redirectToApp();
}

/**
 * Detectar navegação para outra página
 */
function setupNavigationCleanup() {
  // Cleanup ao sair da página
  window.addEventListener('beforeunload', () => {
    if (currentJob) {
      // Sync cleanup (beforeunload não suporta async bem)
      removeLocal('phona:free:downloadJob');
    }
  });
  
  // Cleanup ao navegar via history
  window.addEventListener('popstate', async () => {
    await cleanupJob();
  });
}

/**
 * Inicializar
 */
function init() {
  updateUserInfo();
  loadJob();
  setupNavigationCleanup();
  
  // Event listeners
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  if (backToAppBtn) {
    backToAppBtn.addEventListener('click', handleBackToApp);
  }
  
  if (goToAppBtn) {
    goToAppBtn.addEventListener('click', () => {
      redirectToApp();
    });
  }
  
  // Tracking de download
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      console.log('Download iniciado:', currentJob?.fileName);
      
      // Opcional: mostrar feedback de sucesso
      setTimeout(() => {
        const icon = downloadBtn.querySelector('svg');
        if (icon) {
          icon.innerHTML = `
            <circle cx="12" cy="12" r="10" stroke="currentColor" fill="none" stroke-width="2"></circle>
            <path d="M9 12l2 2 4-4" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
          `;
        }
      }, 1000);
    });
  }
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
