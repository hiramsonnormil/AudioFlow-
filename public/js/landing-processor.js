/**
 * PHONA Landing Page Processor
 * Gerencia o processamento de áudio na landing page com proteção de autenticação
 */

import { isAuthenticated } from './auth/session.js';
import { openModal } from './auth/modal-auth.js';
import { showPlanModal } from './utils/planModal.js';

// Elementos (serão inicializados no init)
let processBtn;
let youtubeUrlInput;
let presetSelect;
let statusContainer;

// Variável de controle para evitar duplo clique
let isProcessing = false;

/**
 * Inicializar proteção do botão de processar
 */
function init() {
  // Capturar elementos do DOM
  processBtn = document.getElementById('processBtn');
  youtubeUrlInput = document.getElementById('youtubeUrl');
  presetSelect = document.getElementById('presetSelect');
  statusContainer = document.getElementById('statusContainer');

  if (!processBtn) {
    console.warn('⚠️ [LANDING] Botão #processBtn não encontrado');
    return;
  }

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

  // Adicionar nosso event listener com captura (fase de captura executa primeiro)
  cleanBtn.addEventListener('click', (e) => {
    handleProcessClick(e);
  }, true);

  // Permitir Enter no input de URL
  youtubeUrlInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessClick(e);
    }
  });
  
  // Limpar erro de duração quando usuário modificar o input
  youtubeUrlInput?.addEventListener('input', () => {
    hideDurationError();
    clearFieldErrors();
  });
  
  // Limpar erro quando mudar o preset
  presetSelect?.addEventListener('change', () => {
    hideDurationError();
    clearFieldErrors();
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
      { value: 'SLOWED', label: '🌙 Slowed (0.88x)' },
      { value: 'SLOWED_REVERB', label: '🌊 Slowed + Reverb' },
      { value: 'SPEED_125', label: '⚡ Speed Up (1.25x)' },
      { value: 'ULTRA_SLOWED', label: '🐌 Ultra Slowed (0.12x)' },
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

  // PROTEÇÃO: Evitar duplo clique
  if (isProcessing) {
    console.warn('⚠️ [LANDING] Processamento já em andamento, ignorando clique duplicado');
    return false;
  }

  // Verificar se está autenticado
  if (!isAuthenticated()) {
    // Mostrar mensagem e abrir modal de login
    showAuthRequiredMessage();
    setTimeout(() => {
      openModal('login');
    }, 100);
    return false; // Importante: retornar false para prevenir propagação
  }

  // Se está autenticado, validar campos
  const url = youtubeUrlInput?.value?.trim();
  const preset = presetSelect?.value;

  // Limpar erros visuais anteriores
  clearFieldErrors();

  // Validar campos vazios
  if (!url && !preset) {
    showFieldError(youtubeUrlInput, 'Cole o link do YouTube aqui');
    showFieldError(presetSelect, 'Escolha um efeito');
    showGeneralError('Preencha o link e escolha um efeito para continuar');
    return false;
  }

  if (!url) {
    showFieldError(youtubeUrlInput, 'Cole o link do YouTube aqui');
    showGeneralError('Cole o link da música do YouTube');
    youtubeUrlInput?.focus();
    return false;
  }

  if (!isValidYouTubeUrl(url)) {
    showFieldError(youtubeUrlInput, 'Este link não é válido');
    showGeneralError('Por favor, insira um link válido do YouTube');
    youtubeUrlInput?.focus();
    return false;
  }

  if (!preset) {
    showFieldError(presetSelect, 'Escolha um efeito');
    showGeneralError('Selecione o efeito que deseja aplicar');
    presetSelect?.focus();
    return false;
  }

  // Verificar se o vídeo existe antes de processar
  validateAndProcess(url, preset);
  return false;
}

/**
 * Validar se o vídeo existe no YouTube antes de processar
 */
async function validateAndProcess(url, preset) {
  // Marcar como processando para evitar múltiplos cliques
  if (isProcessing) {
    return;
  }
  isProcessing = true;

  // Mostrar loading de validação
  processBtn.disabled = true;
  processBtn.innerHTML = `
    <span class="btn-spinner"></span>
    <span class="btn-text">Verificando vídeo...</span>
  `;

  const token = localStorage.getItem('phona:token');

  if (!token) {
    isProcessing = false;
    processBtn.disabled = false;
    updateUIBasedOnAuth();
    showError('Sessão expirada. Faça login novamente.');
    openModal('login');
    return;
  }

  try {
    // Fazer requisição para validar o vídeo
    const response = await fetch('/api/validate-youtube', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok) {
      isProcessing = false;
      processBtn.disabled = false;
      updateUIBasedOnAuth();

      if (response.status === 404 || data.error === 'video_not_found') {
        showFieldError(youtubeUrlInput, 'Este vídeo não existe ou está indisponível');
        showGeneralError(data.message || 'Vídeo não encontrado. Verifique se o link está correto e se o vídeo é público.');
        youtubeUrlInput?.focus();
        return;
      }

      if (data.error === 'video_unavailable') {
        showFieldError(youtubeUrlInput, 'Este vídeo não está disponível');
        showGeneralError(data.message || 'O vídeo pode ser privado ou ter sido removido.');
        youtubeUrlInput?.focus();
        return;
      }

      // Outros erros genéricos
      showGeneralError(data.message || 'Erro ao verificar o vídeo. Tente novamente.');
      return;
    }

    // Vídeo válido, prosseguir com o processamento
    startProcessing(url, preset);

  } catch (error) {
    console.error('Erro ao validar vídeo:', error);
    isProcessing = false;
    processBtn.disabled = false;
    updateUIBasedOnAuth();
    showGeneralError('Erro de conexão. Verifique sua internet e tente novamente.');
  }
}

/**
 * Iniciar processamento do áudio (após validação)
 */
async function startProcessing(url, presetName) {
  // Já está marcado como processando pela validateAndProcess
  const token = localStorage.getItem('phona:token');

  if (!token) {
    isProcessing = false; // Liberar flag
    showError('Sessão expirada. Faça login novamente.');
    openModal('login');
    return;
  }

  // Atualizar texto do botão para "Iniciando..."
  processBtn.innerHTML = `
    <span class="btn-spinner"></span>
    <span class="btn-text">Iniciando processamento...</span>
  `;

  try {
    // Preparar headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Preparar body
    const body = {
      url: url,
      preset: presetName
    };

    // Enviar requisição para criar job
    const response = await fetch('/process', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    let data = null;

    try {
      data = await response.json();
    } catch (parseError) {
      console.warn('⚠️ [LANDING] Falha ao ler JSON da resposta:', parseError);
    }

    if (!response.ok) {
      const errorCode = data?.error;
      const errorMessage = data?.message || data?.error || 'Erro ao iniciar processamento';
      
      // Tratar erro de duração de forma especial (RÁPIDO - sem mostrar "Iniciando...")
      if (errorCode === 'audio_too_long') {
        isProcessing = false;
        processBtn.disabled = false;
        updateUIBasedOnAuth();
        showDurationError(errorMessage);
        return;
      }
      
      if (errorCode === 'preset_not_available') {
        isProcessing = false;
        processBtn.disabled = false;
        updateUIBasedOnAuth();
        showPlanModal(errorMessage || 'Este efeito não está disponível no seu plano atual.');
        return;
      }
      
      if (errorCode === 'plan_limit_reached') {
        isProcessing = false;
        processBtn.disabled = false;
        updateUIBasedOnAuth();
        showPlanModal(errorMessage || 'Você atingiu o limite de processamentos do seu plano.');
        return;
      }
      
      throw new Error(errorMessage);
    }

    if (!data || !data.id) {
      throw new Error('Resposta inesperada do servidor. Tente novamente.');
    }

    // Mostrar "Iniciando processamento..." apenas quando for redirecionar
    if (statusContainer) {
      statusContainer.style.display = 'block';
      document.getElementById('statusText').textContent = 'Iniciando processamento...';
    }
    
    processBtn.innerHTML = `
      <span class="btn-spinner"></span>
      <span class="btn-text">Processando...</span>
    `;

    // Não liberar isProcessing aqui - o redirecionamento vai acontecer
    // Redirecionar para página de processo com o jobId
    window.location.href = `/process?id=${data.id}`;

  } catch (error) {
    // Liberar flag de processamento
    isProcessing = false;

    // Esconder status container (caso tenha sido mostrado)
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
 * Validar URL do YouTube e YouTube Music
 */
function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
    /^(https?:\/\/)?music\.youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?music\.youtube\.com\/watch\?.*v=[\w-]+/
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
 * Destacar campo com erro visual
 */
function showFieldError(field, message) {
  if (!field) return;

  // Adicionar classe de erro ao wrapper
  const wrapper = field.closest('.input-wrapper') || field.closest('.select-wrapper');
  if (wrapper) {
    wrapper.classList.add('field-error');
    wrapper.setAttribute('data-error-message', message);
  }

  // Adicionar shake animation
  field.classList.add('shake-error');
  setTimeout(() => field.classList.remove('shake-error'), 500);
}

/**
 * Limpar erros visuais dos campos
 */
function clearFieldErrors() {
  document.querySelectorAll('.field-error').forEach(el => {
    el.classList.remove('field-error');
    el.removeAttribute('data-error-message');
  });
  
  // Esconder erro geral se existir
  const generalError = document.querySelector('.processor-general-error');
  if (generalError) {
    generalError.remove();
  }
}

/**
 * Mostrar mensagem de erro geral acima do botão
 */
function showGeneralError(message) {
  // Remover erro anterior se existir
  let errorEl = document.querySelector('.processor-general-error');
  
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'processor-general-error';
    processBtn?.parentElement?.insertBefore(errorEl, processBtn);
  }

  errorEl.innerHTML = `
    <div class="error-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10" stroke-width="1.6"></circle>
        <path d="M12 8v4" stroke-width="1.8" stroke-linecap="round"></path>
        <circle cx="12" cy="16" r="1" fill="currentColor"></circle>
      </svg>
    </div>
    <span>${message}</span>
  `;

  // Scroll suave até o erro
  errorEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Remover após 6s
  setTimeout(() => {
    errorEl.classList.add('fade-out');
    setTimeout(() => errorEl.remove(), 300);
  }, 6000);
}

/**
 * Mostrar erro no campo (mantido para compatibilidade)
 */
function showError(message) {
  // Verificar se é erro de duração
  const isDurationError = message.includes('muito longo') || message.includes('até 20 minutos');
  
  if (isDurationError) {
    showDurationError(message);
    return;
  }
  
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
 * Mostrar erro de duração no lugar da nota de guest
 */
function showDurationError(message) {
  const guestNote = document.getElementById('guest-limit-note');
  const durationNote = document.getElementById('duration-error-note');
  const durationMessage = document.getElementById('duration-error-message');
  
  if (guestNote) {
    guestNote.style.display = 'none';
  }
  
  if (durationNote && durationMessage) {
    durationMessage.textContent = message;
    durationNote.style.display = 'flex';
    
    // Scroll suave até a mensagem
    durationNote.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Esconder erro de duração e mostrar nota de guest novamente
 */
function hideDurationError() {
  const guestNote = document.getElementById('guest-limit-note');
  const durationNote = document.getElementById('duration-error-note');
  const isLoggedIn = isAuthenticated();
  
  if (durationNote) {
    durationNote.style.display = 'none';
  }
  
  if (guestNote && !isLoggedIn) {
    guestNote.style.display = 'flex';
  }
}

/**
 * Atualizar UI baseado no estado de autenticação
 */
function updateUIBasedOnAuth() {
  const isLoggedIn = isAuthenticated();
  
  // Controlar visibilidade da nota de limite
  const limitNote = document.getElementById('guest-limit-note');
  if (limitNote) {
    limitNote.style.display = isLoggedIn ? 'none' : 'flex';
  }

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
