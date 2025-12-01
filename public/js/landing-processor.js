/**
 * PHONA Landing Page Processor
 * Gerencia o processamento de áudio na landing page com proteção de autenticação
 */

console.log('🚀 [LANDING-PROCESSOR] Script carregado');

import { isAuthenticated } from './auth/session.js';
import { openModal } from './auth/modal-auth.js';

// Elementos (serão inicializados no init)
let processBtn;
let youtubeUrlInput;
let presetSelect;
let statusContainer;

/**
 * Inicializar proteção do botão de processar
 */
function init() {
  // Capturar elementos do DOM
  processBtn = document.getElementById('processBtn');
  youtubeUrlInput = document.getElementById('youtubeUrl');
  presetSelect = document.getElementById('presetSelect');
  statusContainer = document.getElementById('statusContainer');

  console.log('📋 [LANDING-PROCESSOR] Elementos encontrados:', {
    processBtn: !!processBtn,
    youtubeUrlInput: !!youtubeUrlInput,
    presetSelect: !!presetSelect,
    statusContainer: !!statusContainer
  });

  if (!processBtn) {
    console.warn('⚠️ [LANDING] Botão #processBtn não encontrado');
    return;
  }

  console.log('🔧 [LANDING] Inicializando proteção do botão de processar...');

  // Verificar se foi redirecionado por falta de autenticação
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('requireAuth') === 'true') {
    // Abrir modal de login automaticamente
    setTimeout(() => {
      showAuthRequiredMessage();
      setTimeout(() => {
        openModal('login');
      }, 100);
    }, 500);

    // Limpar parâmetro da URL
    window.history.replaceState({}, document.title, '/');
  }

  // Carregar presets disponíveis
  loadPresets();

  // IMPORTANTE: Remover todos os event listeners existentes clonando o botão
  const newBtn = processBtn.cloneNode(true);
  processBtn.parentNode.replaceChild(newBtn, processBtn);

  // Atualizar referência
  const cleanBtn = document.getElementById('processBtn');

  console.log('🔧 [LANDING] Botão clonado, adicionando event listener...');

  // Adicionar nosso event listener com captura (fase de captura executa primeiro)
  cleanBtn.addEventListener('click', (e) => {
    console.log('🖱️ [LANDING] CLICK DETECTADO NO BOTÃO!');
    handleProcessClick(e);
  }, true);

  console.log('✅ [LANDING] Event listener de proteção instalado no botão:', cleanBtn);

  // Permitir Enter no input de URL
  youtubeUrlInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessClick(e);
    }
  });
}

/**
 * Carregar presets no select
 */
async function loadPresets() {
  if (!presetSelect) return;

  try {
    // Presets disponíveis (mesmo sem autenticação, só para visualização)
    const presets = [
      { value: 'SLOWED', label: '🌙 Slowed (0.75x)' },
      { value: 'SPEED_125', label: '⚡ Speed Up (1.5x)' },
      { value: 'NIGHTCORE', label: '🌟 Nightcore' },
      { value: 'DAYCORE', label: '☀️ Daycore' },
      { value: 'MUFFLED_SLOWED', label: '🌫️ Muffled Slowed' },
      { value: 'MUFFLED_SPEED', label: '🔊 Muffled Speed' },
      { value: 'PHONA', label: '📞 Phona (Telefone)' },
      { value: 'ECHO', label: '🔉 Echo' },
      { value: 'REVERB', label: '🎵 Reverb' },
      { value: 'BASS_BOOST', label: '🔊 Bass Boost' },
      { value: 'ROBOT_VOICE', label: '🤖 Robot Voice' },
      { value: '8D', label: '🎧 8D Audio' },
    ];

    presetSelect.innerHTML = presets
      .map(p => `<option value="${p.value}">${p.label}</option>`)
      .join('');

    // Selecionar primeiro preset por padrão
    presetSelect.selectedIndex = 0;
  } catch (error) {
    console.error('Erro ao carregar presets:', error);
    presetSelect.innerHTML = '<option value="">Erro ao carregar presets</option>';
  }
}

/**
 * Lidar com clique no botão de processar
 */
function handleProcessClick(e) {
  // IMPORTANTE: Prevenir qualquer comportamento padrão
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  console.log('🔒 [LANDING] Botão processar clicado - verificando autenticação...');

  // Verificar se está autenticado
  if (!isAuthenticated()) {
    console.log('❌ [LANDING] Usuário NÃO autenticado - bloqueando processamento');
    // Mostrar mensagem e abrir modal de login
    showAuthRequiredMessage();
    setTimeout(() => {
      openModal('login');
    }, 100);
    return false; // Importante: retornar false para prevenir propagação
  }

  console.log('✅ [LANDING] Usuário autenticado - validando campos...');

  // Se está autenticado, validar campos
  const url = youtubeUrlInput?.value?.trim();
  const preset = presetSelect?.value;

  console.log('📋 [LANDING] URL:', url);
  console.log('📋 [LANDING] Preset:', preset);

  if (!url) {
    console.log('❌ [LANDING] URL vazia');
    showError('Por favor, insira uma URL do YouTube');
    youtubeUrlInput?.focus();
    return false;
  }

  if (!isValidYouTubeUrl(url)) {
    console.log('❌ [LANDING] URL inválida');
    showError('Por favor, insira uma URL válida do YouTube');
    youtubeUrlInput?.focus();
    return false;
  }

  if (!preset) {
    console.log('❌ [LANDING] Preset não selecionado');
    showError('Por favor, selecione um preset');
    presetSelect?.focus();
    return false;
  }

  console.log('✅ [LANDING] Campos validados - iniciando processamento...');

  // Processar áudio diretamente na landing page
  startProcessing(url, preset);
  return false;
}

/**
 * Iniciar processamento do áudio
 */
async function startProcessing(url, presetName) {
  const token = localStorage.getItem('phona:token');

  console.log('🔐 [LANDING] Token do localStorage:', token);

  if (!token) {
    console.error('❌ [LANDING] Token não encontrado!');
    showError('Sessão expirada. Faça login novamente.');
    openModal('login');
    return;
  }

  // Mostrar loading no botão
  processBtn.disabled = true;
  processBtn.innerHTML = `
    <span class="btn-spinner"></span>
    <span class="btn-text">Processando...</span>
  `;

  // Mostrar container de status
  if (statusContainer) {
    statusContainer.style.display = 'block';
    document.getElementById('statusText').textContent = 'Iniciando processamento...';
  }

  try {
    console.log('📤 [LANDING] Enviando requisição para /process...');
    console.log('📤 [LANDING] URL:', url);
    console.log('📤 [LANDING] Preset:', presetName);
    console.log('📤 [LANDING] Token (primeiros 20 chars):', token ? token.substring(0, 20) + '...' : 'Ausente');

    // Preparar headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    console.log('📋 [LANDING] Headers:', headers);

    // Preparar body
    const body = {
      url: url,
      preset: presetName
    };

    console.log('📋 [LANDING] Body:', body);

    // Enviar requisição para criar job
    const response = await fetch('/process', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    console.log('📥 [LANDING] Response status:', response.status);
    console.log('📥 [LANDING] Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📥 [LANDING] Response data:', data);

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao iniciar processamento');
    }

    console.log('✅ [LANDING] Job criado com sucesso:', data.id);
    console.log('🔄 [LANDING] Redirecionando para /html/process.html?id=' + data.id);

    // Redirecionar para página de processo com o jobId
    window.location.href = `/html/process.html?id=${data.id}`;

  } catch (error) {
    console.error('❌ [LANDING] Erro ao processar:', error);

    // Esconder status container
    if (statusContainer) {
      statusContainer.style.display = 'none';
    }

    // Restaurar botão
    processBtn.disabled = false;
    updateUIBasedOnAuth();

    // Mostrar erro
    showError(error.message || 'Erro ao processar áudio. Tente novamente.');

    // Se erro de autenticação, fazer logout
    if (error.message?.includes('autenticação') || error.message?.includes('token')) {
      setTimeout(() => {
        localStorage.removeItem('phona:token');
        localStorage.removeItem('phona:user');
        openModal('login');
      }, 2000);
    }
  }
}

/**
 * Validar URL do YouTube
 */
function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]+/
  ];

  return patterns.some(pattern => pattern.test(url));
}

/**
 * Mostrar mensagem de autenticação necessária
 */
function showAuthRequiredMessage() {
  // Criar toast/notificação
  const message = document.createElement('div');
  message.className = 'auth-required-toast';
  message.innerHTML = `
    <div class="toast-icon">🔒</div>
    <div class="toast-content">
      <strong>Login necessário</strong>
      <p>Faça login para processar áudio</p>
    </div>
  `;

  document.body.appendChild(message);

  // Animar entrada
  setTimeout(() => message.classList.add('show'), 10);

  // Remover após 3s
  setTimeout(() => {
    message.classList.remove('show');
    setTimeout(() => message.remove(), 300);
  }, 3000);
}

/**
 * Mostrar erro no campo
 */
function showError(message) {
  // Criar elemento de erro se não existir
  let errorEl = document.querySelector('.processor-error');

  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'processor-error';
    processBtn?.parentElement?.insertBefore(errorEl, processBtn);
  }

  errorEl.textContent = message;
  errorEl.style.display = 'block';

  // Remover após 5s
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

/**
 * Atualizar UI baseado no estado de autenticação
 */
function updateUIBasedOnAuth() {
  const isLoggedIn = isAuthenticated();

  if (processBtn) {
    if (isLoggedIn) {
      processBtn.innerHTML = `
        <span class="btn-text">Processar áudio</span>
        <span class="btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M5 12h14m-7-7 7 7-7 7"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      `;
    } else {
      processBtn.innerHTML = `
        <span class="btn-text">Fazer login para processar</span>
        <span class="btn-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="10 17 15 12 10 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="15" y1="12" x2="3" y2="12" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      `;
    }
  }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
    updateUIBasedOnAuth();
  });
} else {
  init();
  updateUIBasedOnAuth();
}

// Escutar mudanças no storage (login/logout em outra aba)
window.addEventListener('storage', (e) => {
  if (e.key === 'phona_session' || e.key === null) {
    updateUIBasedOnAuth();
  }
});
