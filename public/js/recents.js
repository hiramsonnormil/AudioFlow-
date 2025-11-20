/**
 * recents.js - Gerencia a página de processamentos recentes
 */

import { getToken, getCurrentUser } from './auth/session.js';

const API_BASE = '';

// Inicializa a página
async function init() {
  console.log('🎵 Inicializando página de processamentos recentes');
  
  // Verifica autenticação
  const token = getToken();
  if (!token) {
    console.warn('⚠️ Usuário não autenticado - redirecionando para login');
    window.location.href = '/html/login.html';
    return;
  }

  // Carrega info do usuário
  const user = getCurrentUser();
  if (user?.email) {
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-info').style.display = 'block';
  }

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

// Carrega os processamentos do usuário
async function loadProcessings() {
  const loading = document.getElementById('loading');
  const emptyState = document.getElementById('empty-state');
  const grid = document.getElementById('processing-grid');

  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/recent-processings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Processamentos carregados:', data);

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

  const expirationPercent = Math.max(0, (proc.expiresIn / (60 * 60 * 1000)) * 100);
  const timeRemaining = formatTimeRemaining(proc.expiresIn);
  const isWarning = proc.expiresIn < 20 * 60 * 1000; // menos de 20 min
  const isDanger = proc.expiresIn < 5 * 60 * 1000; // menos de 5 min

  // Extrai preset do metadata ou do jobId
  const preset = proc.preset || 'DESCONHECIDO';
  
  // Nome do arquivo ou jobId
  const displayName = proc.fileName || proc.jobId;

  card.innerHTML = `
    <div class="card-header">
      <div class="card-title">${displayName}</div>
    </div>
    
    <div class="card-preset">${preset}</div>

    <div class="card-info">
      <div class="info-row">
        <span class="info-label">👤 Usuário:</span>
        <span class="info-value">${proc.userId || 'Desconhecido'}</span>
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
    
    <div class="expiration-time ${isDanger ? 'danger' : isWarning ? 'warning' : ''}" data-expires="${proc.expiresIn}">
      ⏱️ Expira em: <strong>${timeRemaining}</strong>
    </div>

    <div class="card-actions">
      <a href="/api/download/${proc.key}" class="btn-download" download target="_blank">
        📥 Download
      </a>
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
    expiresIn -= 1000; // Decrementa 1 segundo
    
    if (expiresIn <= 0) {
      // Arquivo expirado - remove o card
      card.remove();
      
      // Verifica se não há mais cards
      const remainingCards = document.querySelectorAll('.processing-card');
      if (remainingCards.length === 0) {
        document.getElementById('processing-grid').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
      }
      return;
    }

    // Atualiza o dataset
    card.dataset.expiresIn = expiresIn;

    // Atualiza o texto
    const timeText = timeElement.querySelector('strong');
    if (timeText) {
      timeText.textContent = formatTimeRemaining(expiresIn);
    }

    // Atualiza as classes de aviso
    timeElement.classList.remove('warning', 'danger');
    if (expiresIn < 5 * 60 * 1000) {
      timeElement.classList.add('danger');
    } else if (expiresIn < 20 * 60 * 1000) {
      timeElement.classList.add('warning');
    }

    // Atualiza a barra de progresso
    const expirationPercent = Math.max(0, (expiresIn / (60 * 60 * 1000)) * 100);
    if (progressBar) {
      progressBar.style.width = `${expirationPercent}%`;
    }
  });
}

// Deleta um processamento
window.deleteProcessing = async function(key) {
  if (!confirm('Tem certeza que deseja deletar este arquivo?')) {
    return;
  }

  try {
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/r2-test/delete/${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('✅ Arquivo deletado:', key);

    // Remove o card da interface
    const card = document.querySelector(`[data-key="${key}"]`);
    if (card) {
      card.remove();
    }

    // Verifica se não há mais cards
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

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
