/**
 * PHONA Landing Page Processor
 * Gerencia o processamento de áudio na landing page (Versão Local)
 */

// Elementos (serão inicializados no init)
let processBtn;
let youtubeUrlInput;
let presetSelect;
let statusContainer;

/**
 * Inicializar
 */
function init() {
  processBtn = document.getElementById('processBtn');
  youtubeUrlInput = document.getElementById('youtubeUrl');
  presetSelect = document.getElementById('presetSelect');
  statusContainer = document.getElementById('statusContainer');

  if (!processBtn) {
    return;
  }

  loadPresets();

  const newBtn = processBtn.cloneNode(true);
  processBtn.parentNode.replaceChild(newBtn, processBtn);
  const cleanBtn = document.getElementById('processBtn');

  cleanBtn.addEventListener('click', (e) => {
    handleProcessClick(e);
  }, true);

  youtubeUrlInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessClick(e);
    }
  });

  updateUI();
}

/**
 * Carregar presets no select
 */
async function loadPresets() {
  if (!presetSelect) return;
  try {
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
    presetSelect.selectedIndex = 0;
  } catch (error) {
    presetSelect.innerHTML = '<option value="">Erro ao carregar presets</option>';
  }
}

function handleProcessClick(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  const url = youtubeUrlInput?.value?.trim();
  const preset = presetSelect?.value;

  if (!url) {
    showError('Por favor, insira uma URL do YouTube');
    youtubeUrlInput?.focus();
    return false;
  }

  if (!isValidYouTubeUrl(url)) {
    showError('Por favor, insira uma URL válida do YouTube');
    youtubeUrlInput?.focus();
    return false;
  }

  if (!preset) {
    showError('Por favor, selecione um preset');
    presetSelect?.focus();
    return false;
  }

  startProcessing(url, preset);
  return false;
}

async function startProcessing(url, presetName) {
  processBtn.disabled = true;
  processBtn.innerHTML = `
    <span class="btn-spinner"></span>
    <span class="btn-text">Processando...</span>
  `;

  if (statusContainer) {
    statusContainer.style.display = 'block';
    document.getElementById('statusText').textContent = 'Iniciando processamento...';
  }

  try {
    const response = await fetch('/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url, preset: presetName })
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {}

    if (!response.ok) {
      throw new Error(data?.message || data?.error || 'Erro ao iniciar processamento');
    }

    if (!data || !data.id) {
      throw new Error('Resposta inesperada do servidor. Tente novamente.');
    }

    window.location.href = `/html/process.html?id=${data.id}`;
  } catch (error) {
    console.error('❌ [LANDING] Erro ao processar:', error);
    if (statusContainer) statusContainer.style.display = 'none';
    processBtn.disabled = false;
    updateUI();
    showError(error.message || 'Erro ao processar áudio. Tente novamente.');
  }
}

function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=[\w-]+/,
    /^(https?:\/\/)?music\.youtube\.com\/watch\?v=[\w-]+/,
    /^(https?:\/\/)?music\.youtube\.com\/watch\?.*v=[\w-]+/
  ];
  return patterns.some(pattern => pattern.test(url));
}

function showError(message) {
  let errorEl = document.querySelector('.processor-error');
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.className = 'processor-error';
    processBtn?.parentElement?.insertBefore(errorEl, processBtn);
  }
  errorEl.textContent = message;
  errorEl.style.display = 'block';
  setTimeout(() => {
    errorEl.style.display = 'none';
  }, 5000);
}

function updateUI() {
  if (processBtn) {
    processBtn.innerHTML = `
      <span class="btn-text">Processar áudio</span>
      <span class="btn-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M5 12h14m-7-7 7 7-7 7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </span>
    `;
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
