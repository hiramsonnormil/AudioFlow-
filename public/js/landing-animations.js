/* ==========================================
   PHONA LANDING ANIMATIONS
   ========================================== */

import { confirmLogout } from './confirm-modal.js';
import { isAuthenticated } from './auth/session.js';

// Smooth scroll
function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function scrollToProcessor() {
  const processor = document.getElementById("processor");
  if (processor) {
    processor.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// Exportar funções para uso global no HTML
window.scrollToSection = scrollToSection;
window.scrollToProcessor = scrollToProcessor;

// Atualizar texto do sticky CTA baseado no estado de autenticação
function updateStickyCTA() {
  const stickyBtn = document.querySelector('.sticky-btn span:first-child');
  if (stickyBtn) {
    if (isAuthenticated()) {
      stickyBtn.textContent = 'Criar meu remix';
    } else {
      stickyBtn.textContent = 'Criar conta grátis';
    }
  }
}

// Atualizar na inicialização
updateStickyCTA();

// Atualizar quando o estado de autenticação mudar
window.addEventListener('storage', (e) => {
  if (e.key === 'phona:token') {
    updateStickyCTA();
  }
});

// Sticky CTA visibility on scroll (otimizado com throttle)
const stickyCta = document.querySelector(".sticky-cta");
const processorSection = document.getElementById("processor");

if (stickyCta && processorSection) {
  let ticking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const processorRect = processorSection.getBoundingClientRect();
          const isProcessorVisible =
            processorRect.top <= window.innerHeight &&
            processorRect.bottom >= 0;

          if (isProcessorVisible) {
            stickyCta.style.opacity = "0";
            stickyCta.style.pointerEvents = "none";
          } else {
            stickyCta.style.opacity = "1";
            stickyCta.style.pointerEvents = "all";
          }
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
}

// Hero waveform animation (otimizado)
const canvas = document.getElementById("waveformCanvas");
if (canvas) {
  const ctx = canvas.getContext("2d");
  let animationId;
  let isAnimating = false;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let time = 0;
  let frameCount = 0;
  const skipFrames = 1; // Renderiza a cada 2 frames (30fps ao invés de 60fps)

  function drawWaveform() {
    frameCount++;

    // Pula frames para melhor performance
    if (frameCount % skipFrames !== 0) {
      animationId = requestAnimationFrame(drawWaveform);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Reduzido para 3 camadas ao invés de 5
    for (let layer = 0; layer < 3; layer++) {
      ctx.strokeStyle = `rgba(194, 140, 102, ${0.06 + layer * 0.03})`;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Aumentado o step de 4 para 8 para menos pontos
      for (let x = 0; x < canvas.width; x += 8) {
        const frequency = 0.008 + layer * 0.002;
        const amplitude = 20 + layer * 10;
        const phase = time * 0.3 + layer * 50;
        const y =
          canvas.height / 2 + Math.sin((x + phase) * frequency) * amplitude;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    }

    time += 1;
    animationId = requestAnimationFrame(drawWaveform);
  }

  // Inicia animação apenas quando visível
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isAnimating) {
          isAnimating = true;
          drawWaveform();
        } else if (!entry.isIntersecting && isAnimating) {
          isAnimating = false;
          cancelAnimationFrame(animationId);
        }
      });
    },
    { threshold: 0.1 }
  );

  observer.observe(canvas);
}

// Mockup waveform
const mockupCanvas = document.getElementById("mockupWaveCanvas");
if (mockupCanvas) {
  const mockupCtx = mockupCanvas.getContext("2d");

  function drawMockupWave() {
    mockupCtx.clearRect(0, 0, mockupCanvas.width, mockupCanvas.height);

    // Create waveform bars
    const barCount = 120;
    const barWidth = mockupCanvas.width / barCount;

    for (let i = 0; i < barCount; i++) {
      const progress = i / barCount;

      // Create varying heights for natural waveform look
      const baseHeight = Math.sin(progress * Math.PI * 3) * 0.6 + 0.4;
      const randomness = Math.random() * 0.3;
      const height = (baseHeight + randomness) * mockupCanvas.height * 0.8;

      const x = i * barWidth;
      const y = (mockupCanvas.height - height) / 2;

      // Gradient based on position
      const alpha = progress < 0.45 ? 0.4 : 0.15;
      mockupCtx.fillStyle = `rgba(194, 140, 102, ${alpha})`;
      mockupCtx.fillRect(x, y, barWidth - 1, height);
    }
  }

  drawMockupWave();
}

// Effect cards wave animation on hover
const effectCards = document.querySelectorAll(".effect-card");
effectCards.forEach((card) => {
  const waveCanvas = card.querySelector(".effect-wave");
  if (!waveCanvas) return;

  const ctx = waveCanvas.getContext("2d");
  const effect = card.dataset.effect;

  function drawEffectWave() {
    ctx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);

    const barCount = 40;
    const barWidth = waveCanvas.width / barCount;

    for (let i = 0; i < barCount; i++) {
      let height;

      // Different wave patterns for different effects
      switch (effect) {
        case "slowed":
          height = Math.sin(i * 0.3) * 15 + 20;
          break;
        case "reverb":
          height = Math.abs(Math.sin(i * 0.2) * Math.cos(i * 0.1)) * 30 + 10;
          break;
        case "daycore":
          height = Math.sin(i * 0.25) * 18 + 18;
          break;
        case "nightcore":
          height = Math.abs(Math.sin(i * 0.5)) * 25 + 15;
          break;
        case "8d":
          height = Math.sin(i * 0.4) * Math.cos(i * 0.2) * 20 + 20;
          break;
        case "vaporwave":
          height = (Math.sin(i * 0.15) + Math.random() * 0.5) * 15 + 15;
          break;
        default:
          height = Math.random() * 30 + 10;
      }

      const x = i * barWidth;
      const y = (waveCanvas.height - height) / 2;

      ctx.fillStyle = "rgba(194, 140, 102, 0.5)";
      ctx.fillRect(x, y, barWidth - 1, height);
    }
  }

  card.addEventListener("mouseenter", drawEffectWave);
});

// Example spectrum visualization (otimizado)
const spectrumCanvases = document.querySelectorAll(".spectrum-canvas");
spectrumCanvases.forEach((canvas, index) => {
  const ctx = canvas.getContext("2d");
  const isProcessed = canvas.classList.contains("processed");

  let animationId;
  let time = 0;
  let frameCount = 0;
  const skipFrames = 2; // Renderiza a cada 3 frames

  function drawSpectrum() {
    frameCount++;

    // Pula frames para melhor performance
    if (frameCount % skipFrames !== 0) {
      animationId = requestAnimationFrame(drawSpectrum);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barCount = 40; // Reduzido de 60 para 40
    const barWidth = canvas.width / barCount;

    for (let i = 0; i < barCount; i++) {
      const frequency = i / barCount;

      // Different spectrum for processed audio
      let height;
      if (isProcessed) {
        // More bass (left side) for slowed effect
        const bassBoost = Math.max(0, 1 - frequency * 2);
        height =
          (Math.sin(time * 0.04 + i * 0.2) * 0.5 + 0.5) * (30 + bassBoost * 20);
      } else {
        // Normal spectrum
        height = (Math.sin(time * 0.06 + i * 0.15) * 0.5 + 0.5) * 40;
      }

      const x = i * barWidth;
      const y = canvas.height - height;

      // Simplificado sem gradiente para melhor performance
      ctx.fillStyle = isProcessed
        ? "rgba(194, 140, 102, 0.4)"
        : "rgba(194, 140, 102, 0.2)";
      ctx.fillRect(x, y, barWidth - 1, height);
    }

    time += 1;
    animationId = requestAnimationFrame(drawSpectrum);
  }

  // Start animation when in viewport
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          drawSpectrum();
        } else {
          cancelAnimationFrame(animationId);
          frameCount = 0;
        }
      });
    },
    { threshold: 0.3 }
  );

  observer.observe(canvas);
});

// Parallax effect on scroll (otimizado com throttle)
const hero = document.querySelector(".hero-content");
if (hero) {
  let ticking = false;

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.pageYOffset;
          const rate = scrolled * 0.3; // Reduzido de 0.5 para 0.3
          hero.style.transform = `translate3d(0, ${rate}px, 0)`;
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );
}

// Intersection observer for fade-in animations (otimizado)
const observerOptions = {
  threshold: 0.15,
  rootMargin: "0px 0px -50px 0px",
};

const fadeElements = document.querySelectorAll(
  ".effect-card, .step, .example-card"
);
const fadeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      // Remove o delay individual para evitar muitas operações
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translate3d(0, 0, 0)";
      fadeObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

fadeElements.forEach((element) => {
  element.style.opacity = "0";
  element.style.transform = "translate3d(0, 20px, 0)";
  element.style.transition = "opacity 0.4s ease, transform 0.4s ease";
  fadeObserver.observe(element);
});

// Knob interaction
const knobs = document.querySelectorAll(".knob-dial");
knobs.forEach((knob) => {
  let rotation = 0;

  knob.addEventListener("mousedown", (e) => {
    const startY = e.clientY;
    const startRotation = rotation;

    function onMouseMove(e) {
      const deltaY = startY - e.clientY;
      rotation = startRotation + deltaY;
      rotation = Math.max(-135, Math.min(135, rotation));
      knob.style.transform = `rotate(${rotation}deg)`;
    }

    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
});

// Mockup play button animation
const mockupPlay = document.querySelector(".mockup-play");
if (mockupPlay) {
  let isPlaying = false;

  mockupPlay.addEventListener("click", () => {
    isPlaying = !isPlaying;

    if (isPlaying) {
      mockupPlay.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;
    } else {
      mockupPlay.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
    }
  });
}

// Example vinyl play buttons
const examplePlays = document.querySelectorAll(".example-play");
examplePlays.forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".example-card");
    const vinyl = card.querySelector(".vinyl-disc");
    const isPlaying = vinyl.style.animationPlayState === "running";

    if (isPlaying) {
      vinyl.style.animationPlayState = "paused";
      btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
    } else {
      vinyl.style.animationPlayState = "running";
      btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                </svg>
            `;

      // Reset other playing vinyls
      document.querySelectorAll(".vinyl-disc").forEach((otherVinyl) => {
        if (otherVinyl !== vinyl) {
          otherVinyl.style.animationPlayState = "paused";
        }
      });

      document.querySelectorAll(".example-play").forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                        </svg>
            `;
        }
      });
    }
  });
});

// Load presets function with filter support
let allPresets = [];

async function loadPresets() {
  const presetSelect = document.getElementById("presetSelect");
  if (!presetSelect) return;

  try {
    const response = await fetch("/presets");
    if (!response.ok) throw new Error("Failed to load presets");

    const presets = await response.json();
    allPresets = presets; // Store all presets globally

    // Render presets (all by default)
    renderPresets(presets);

    // Create custom select with icons
    createCustomSelect(presetSelect, presets);

    // Aplicar filtro baseado no plano do usuário
    applyUserPlanFilter();

  } catch (error) {
    console.error("Error loading presets:", error);
    if (presetSelect.options.length === 0) {
      presetSelect.innerHTML =
        '<option value="">Erro ao carregar presets</option>';
    }
  }
}

// Aplicar filtro automaticamente baseado no plano do usuário
function applyUserPlanFilter() {
  try {
    // Obter plano do usuário do localStorage
    const userStr = localStorage.getItem('phona:user');
    if (!userStr) return;

    const user = JSON.parse(userStr);
    const userPlan = user?.plan || 'free';

    // Encontrar a aba correspondente ao plano
    const tabs = document.querySelectorAll('.preset-tab');
    if (!tabs.length) return;

    let filterToApply = 'all';

    // Mapear plano para filtro
    switch (userPlan) {
      case 'voz_pro':
        filterToApply = 'pro';
        break;
      case 'voz_master':
        filterToApply = 'master';
        break;
      case 'voz_plus_master':
      case 'plano_plus_master':
        filterToApply = 'plus_master';
        break;
      case 'free':
        filterToApply = 'free';
        break;
      default:
        filterToApply = 'all';
    }

    // Encontrar e clicar na aba correspondente
    const targetTab = Array.from(tabs).find(tab => tab.dataset.filter === filterToApply);
    if (targetTab) {
      targetTab.click();
    }
  } catch (error) {
    // Silenciosamente ignorar erros de filtro automático
  }
}

// Render presets into select element
function renderPresets(presets) {
  const presetSelect = document.getElementById("presetSelect");
  if (!presetSelect) return;

  // Clear existing options
  presetSelect.innerHTML = "";

  // Add default option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Selecione um efeito...";
  presetSelect.appendChild(defaultOption);

  // Add each preset to native select (fallback)
  presets.forEach((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = `${preset.name} - ${preset.description}`;
    option.dataset.icon = preset.icon;
    presetSelect.appendChild(option);
  });
}

// Setup preset filter tabs (dentro do dropdown)
function setupPresetFilterTabs(dropdown, wrapper, nativeSelect, iconSpan, textSpan) {
  const tabs = dropdown.querySelectorAll('.preset-tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita fechar o dropdown
      
      // Update active state
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Get filter value
      const filter = tab.dataset.filter;

      // Filter presets
      const filteredPresets = filterPresetsByPlan(filter);

      // Remove old preset options (mantém placeholder e tabs)
      const presetOptions = dropdown.querySelectorAll('.custom-select-option:not(.placeholder)');
      presetOptions.forEach(opt => opt.remove());

      // Add filtered preset options
      filteredPresets.forEach((preset) => {
        const option = document.createElement("div");
        option.className = "custom-select-option";
        option.dataset.value = preset.id;

        const optionIcon = document.createElement("span");
        optionIcon.className = "custom-select-option-icon";
        optionIcon.innerHTML = preset.icon;

        const optionText = document.createElement("span");
        optionText.className = "custom-select-option-text";
        optionText.textContent = `${preset.name} - ${preset.description}`;

        option.appendChild(optionIcon);
        option.appendChild(optionText);
        dropdown.appendChild(option);

        // Add click handler
        option.addEventListener("click", () => {
          dropdown.querySelectorAll(".custom-select-option").forEach((opt) => {
            opt.classList.remove("selected");
          });
          option.classList.add("selected");

          if (preset) {
            iconSpan.innerHTML = preset.icon;
            textSpan.textContent = `${preset.name} - ${preset.description}`;
            nativeSelect.value = preset.id;
          }

          nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
          wrapper.classList.remove("open");
        });
      });
    });
  });
}

// Filter presets by plan
function filterPresetsByPlan(filter) {
  if (filter === 'all') {
    return allPresets;
  }

  // Define preset tiers
  const freePresets = ['SLOWED', 'SLOWED_REVERB'];
  const proPresets = ['SPEED_125', 'ULTRA_SLOWED', 'MUFFLED_SLOWED', 'MUFFLED_SPEED', 
                     'DAYCORE', 'NIGHTCORE', 'PHONA', 'ECHO', 'REVERB'];
  const masterPresets = ['BASS_BOOST', 'ROBOT_VOICE', '8D'];
  const plusMasterPresets = ['BABY_VOICE', 'DEEP_VOICE', 'VAPORWAVE_CLEAN', 
                             'RADIO_RETRO_AM', 'CRYSTAL_SPEED', 'TAPE_WARP',
                             'WHISPER_CORE', 'GHOST_REVERB', 'CHOIRIFY', 'SUBHARMONIC_BASS'];

  let allowedPresets = [];

  switch (filter) {
    case 'free':
      allowedPresets = freePresets;
      break;
    case 'pro':
    case 'voz_pro':
      allowedPresets = [...freePresets, ...proPresets];
      break;
    case 'master':
    case 'voz_master':
      allowedPresets = [...freePresets, ...proPresets, ...masterPresets];
      break;
    case 'plus_master':
    case 'voz_plus_master':
    case 'plano_plus_master':
      // Plus Master tem acesso a TODOS os presets
      allowedPresets = [...freePresets, ...proPresets, ...masterPresets, ...plusMasterPresets];
      break;
  }

  return allPresets.filter(preset => allowedPresets.includes(preset.id));
}

// Create custom select dropdown with icons
function createCustomSelect(nativeSelect, presets) {
  const wrapper = nativeSelect.closest(".select-wrapper");
  if (!wrapper) return;

  // Add custom select class
  wrapper.classList.add("custom-select");

  // Create custom select structure
  const trigger = document.createElement("div");
  trigger.className = "custom-select-trigger";

  const iconSpan = document.createElement("span");
  iconSpan.className = "custom-select-icon";

  const textSpan = document.createElement("span");
  textSpan.textContent = "Selecione um efeito...";

  const arrow = document.createElement("span");
  arrow.className = "custom-select-arrow";
  arrow.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  trigger.appendChild(iconSpan);
  trigger.appendChild(textSpan);
  trigger.appendChild(arrow);

  // Create dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "custom-select-dropdown";

  // Add placeholder option
  const placeholderOption = document.createElement("div");
  placeholderOption.className = "custom-select-option placeholder";
  placeholderOption.textContent = "Selecione um efeito...";
  placeholderOption.dataset.value = "";
  dropdown.appendChild(placeholderOption);

  // Add Filter Tabs inside dropdown
  const filterTabs = document.createElement("div");
  filterTabs.className = "preset-filter-tabs";
  filterTabs.innerHTML = `
    <button class="preset-tab active" data-filter="all">Todos</button>
    <button class="preset-tab" data-filter="free">Free</button>
    <button class="preset-tab" data-filter="pro">Pro</button>
    <button class="preset-tab" data-filter="master">Master</button>
    <button class="preset-tab preset-tab-premium" data-filter="plus_master">Plus Master</button>
  `;
  dropdown.appendChild(filterTabs);

  // Add preset options
  presets.forEach((preset) => {
    const option = document.createElement("div");
    option.className = "custom-select-option";
    option.dataset.value = preset.id;

    const optionIcon = document.createElement("span");
    optionIcon.className = "custom-select-option-icon";
    optionIcon.innerHTML = preset.icon;

    const optionText = document.createElement("span");
    optionText.className = "custom-select-option-text";
    optionText.textContent = `${preset.name} - ${preset.description} `;

    option.appendChild(optionIcon);
    option.appendChild(optionText);
    dropdown.appendChild(option);

    // Click handler for option
    option.addEventListener("click", () => {
      selectOption(
        option,
        preset,
        nativeSelect,
        wrapper,
        trigger,
        iconSpan,
        textSpan
      );
    });
  });

  // Toggle dropdown
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    wrapper.classList.toggle("open");
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove("open");
    }
  });

  // Append custom select
  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);

  // Hide native select visually but keep it functional
  wrapper.classList.add("native-hidden");

  // Setup filter tabs
  setupPresetFilterTabs(dropdown, wrapper, nativeSelect, iconSpan, textSpan);
}

function selectOption(
  optionEl,
  preset,
  nativeSelect,
  wrapper,
  trigger,
  iconSpan,
  textSpan
) {
  // Remove selected class from all options
  wrapper.querySelectorAll(".custom-select-option").forEach((opt) => {
    opt.classList.remove("selected");
  });

  // Add selected class
  optionEl.classList.add("selected");

  // Update trigger
  if (preset) {
    iconSpan.innerHTML = preset.icon;
    textSpan.textContent = `${preset.name} - ${preset.description} `;
    nativeSelect.value = preset.id;
  } else {
    iconSpan.innerHTML = "";
    textSpan.textContent = "Selecione um efeito...";
    nativeSelect.value = "";
  }

  // Trigger change event on native select
  nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));

  // Close dropdown
  wrapper.classList.remove("open");
}

// Função para transição suave para página de processamento
function transitionToProcessPage(jobId) {
  // Criar elemento com animação de carregamento
  const loadingScreen = document.createElement("div");
  loadingScreen.className = "transition-loading";
  loadingScreen.innerHTML = `
            < div class="vinyl" ></div >
              <div class="loading-text">
                Carregando<span class="loading-dots"></span>
              </div>
          `;
  document.body.appendChild(loadingScreen);

  // Aguardar um pouco e então navegar
  setTimeout(() => {
    window.location.href = `/ process ? id = ${jobId} `;
  }, 800);
}

function showError(message) {
  alert(message);
}

// Process button handler
const processBtn = document.getElementById("processBtn");
if (processBtn) {
  processBtn.addEventListener("click", async () => {
    const urlInput = document.getElementById("youtubeUrl");
    const presetSelect = document.getElementById("presetSelect");

    const url = urlInput.value.trim();
    const preset = presetSelect.value;

    // Validações
    if (!url) {
      showError("Por favor, insira um URL do YouTube");
      return;
    }

    if (!preset) {
      showError("Por favor, selecione um preset");
      return;
    }

    try {
      // Desabilitar botão
      processBtn.disabled = true;
      processBtn.innerHTML = '<span class="btn-text">Carregando...</span>';

      // Fazer requisição POST para criar o job
      const r = await fetch("/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, preset }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "server error");

      // Transição suave para página de processamento
      transitionToProcessPage(j.id);
    } catch (err) {
      showError("Erro: " + err.message);
      processBtn.disabled = false;
      processBtn.innerHTML = '<span class="btn-text">Processar áudio</span>';
    }
  });
}

// Initialize
function init() {
  loadPresets();

  // Add smooth reveal on page load (otimizado)
  document.body.style.opacity = "0";
  // Usa requestAnimationFrame para evitar layout thrashing
  requestAnimationFrame(() => {
    document.body.style.transition = "opacity 0.4s ease";
    document.body.style.opacity = "1";
  });

  // Setup mobile menu
  setupMobileMenu();
}

// Run init when DOM is ready (handles both cases: before and after DOMContentLoaded)
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", init);
} else {
  // DOM already loaded, run init immediately
  init();
}

// Mobile Menu Setup
function setupMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (!hamburgerBtn || !mobileMenu || !mobileMenuOverlay) return;

  // Update mobile menu auth state
  updateMobileMenuAuth();

  // Toggle menu function
  function toggleMobileMenu() {
    const isActive = mobileMenu.classList.contains('active');

    if (isActive) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function openMobileMenu() {
    hamburgerBtn.classList.add('active');
    mobileMenu.classList.add('active');
    mobileMenuOverlay.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden'; // Prevent body scroll
  }

  function closeMobileMenu() {
    hamburgerBtn.classList.remove('active');
    mobileMenu.classList.remove('active');
    mobileMenuOverlay.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = ''; // Restore body scroll
  }

  // Hamburger button click
  hamburgerBtn.addEventListener('click', toggleMobileMenu);

  // Overlay click to close
  mobileMenuOverlay.addEventListener('click', closeMobileMenu);

  // Close menu when clicking on a link
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMobileMenu();
    });
  });

  // Close menu on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  // Close menu on window resize to desktop size
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && mobileMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });
}

// Update mobile menu authentication state
function updateMobileMenuAuth() {
  // Check if user is authenticated (check localStorage)
  const token = localStorage.getItem('phona:token');
  const user = localStorage.getItem('phona:user');

  const mobileLoginBtn = document.getElementById('mobile-openLoginBtn');
  const mobileSignupBtn = document.getElementById('mobile-openSignupBtn');
  const mobileMenuNav = document.querySelector('.mobile-menu-nav');

  if (!mobileMenuNav) return;

  if (token && user) {
    // User is logged in
    const userData = JSON.parse(user);
    const userName = userData?.username || userData?.email?.split('@')[0] || 'Usuário';

    // Hide login/signup buttons
    if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
    if (mobileSignupBtn) mobileSignupBtn.style.display = 'none';

    // Add user info and logout button if not already present
    let userSection = mobileMenuNav.querySelector('.mobile-user-section');
    if (!userSection) {
      userSection = document.createElement('div');
      userSection.className = 'mobile-user-section';
      userSection.innerHTML = `
        <div class="mobile-user-info">
          <span class="mobile-user-initial">${userName.charAt(0).toUpperCase()}</span>
          <span class="mobile-user-label">${userName}</span>
        </div>
        <button class="mobile-nav-link mobile-logout-btn" id="mobile-logoutBtn">Sair</button>
      `;
      mobileMenuNav.appendChild(userSection);




      // Add logout handler
      const logoutBtn = document.getElementById('mobile-logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          // Mostrar modal de confirmação bonito
          const confirmed = await confirmLogout();
          if (!confirmed) return;

          localStorage.removeItem('phona:token');
          localStorage.removeItem('phona:user');
          window.location.reload();
        });
      }
    }
  } else {
    // User is not logged in
    if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';
    if (mobileSignupBtn) mobileSignupBtn.style.display = 'flex';

    // Remove user section if exists
    const userSection = mobileMenuNav.querySelector('.mobile-user-section');
    if (userSection) {
      userSection.remove();
    }
  }
}
