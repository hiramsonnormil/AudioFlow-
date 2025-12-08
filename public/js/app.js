import { showPlanModal } from "./utils/planModal.js";

const form = document.getElementById("form");
const urlEl = document.getElementById("url");
const presetEl = document.getElementById("preset");
const startBtn = document.getElementById("start");
const errorMsg = document.getElementById("errorMsg");

// Create custom select dropdown with icons
function createCustomSelect(nativeSelect, presets) {
  const wrapper = nativeSelect.closest(".select-wrapper");
  if (!wrapper) return;

  wrapper.classList.add("custom-select");

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

  const dropdown = document.createElement("div");
  dropdown.className = "custom-select-dropdown";

  const placeholderOption = document.createElement("div");
  placeholderOption.className = "custom-select-option placeholder";
  placeholderOption.textContent = "Selecione um efeito...";
  placeholderOption.dataset.value = "";
  dropdown.appendChild(placeholderOption);

  presets.forEach((preset) => {
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

    option.addEventListener("click", () => {
      wrapper.querySelectorAll(".custom-select-option").forEach((opt) => {
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

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    wrapper.classList.toggle("open");
  });

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove("open");
    }
  });

  wrapper.appendChild(trigger);
  wrapper.appendChild(dropdown);
  wrapper.classList.add("native-hidden");
}

// Carregar presets ao iniciar
(async function loadPresets() {
  if (!presetEl) return;

  try {
    const response = await fetch("/presets");
    if (!response.ok) throw new Error("Failed to load presets");

    const presets = await response.json();

    // Limpar opções existentes
    presetEl.innerHTML = "";

    // Adicionar opção default
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Selecione um efeito...";
    presetEl.appendChild(defaultOption);

    // Adicionar cada preset ao select nativo (fallback)
    presets.forEach((preset) => {
      const option = document.createElement("option");
      option.value = preset.id;
      option.textContent = `${preset.name} - ${preset.description}`;
      option.dataset.icon = preset.icon;
      presetEl.appendChild(option);
    });

    // Criar custom select com ícones
    createCustomSelect(presetEl, presets);

  } catch (error) {
    console.error("Error loading presets:", error);
    if (presetEl.options.length === 0) {
      presetEl.innerHTML = '<option value="">Erro ao carregar presets</option>';
    }
  }
})();

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

// Função para validar URL do YouTube e YouTube Music
function isValidYouTubeUrl(url) {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("youtu.be") ||
      urlObj.hostname.includes("music.youtube.com")
    );
  } catch (e) {
    return false;
  }
}

// Função para fazer prefetch da thumbnail
function prefetchThumbnail() {
  const url = urlEl?.value?.trim();

  // Validar URL
  if (!url || !isValidYouTubeUrl(url)) {
    return;
  }

  // Extrair video ID
  const videoId = extractVideoId(url);
  if (!videoId) {
    return;
  }

  // Verificar se já foi precarregado nesta sessão
  const cachedVideoId = sessionStorage.getItem("prefetchedVideoId");
  if (cachedVideoId === videoId) {
    return; // Já foi precarregado, não faz nada
  }

  // Prefetch da thumbnail
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const img = new Image();
  img.onload = () => {
    sessionStorage.setItem("prefetchedVideoId", videoId);
    sessionStorage.setItem("prefetchedThumbUrl", thumbUrl);
  };
  img.onerror = () => {
    const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const imgFallback = new Image();
    imgFallback.onload = () => {
      sessionStorage.setItem("prefetchedVideoId", videoId);
      sessionStorage.setItem("prefetchedThumbUrl", fallbackUrl);
    };
    imgFallback.src = fallbackUrl;
  };
  img.src = thumbUrl;
}

// Prefetch de thumbnail quando mouse entra no botão de processar
if (startBtn && urlEl) {
  startBtn.addEventListener("mouseover", prefetchThumbnail);
  startBtn.addEventListener("focus", prefetchThumbnail);
}

// Prefetch também quando o input do YouTube tem valor e perde o foco
if (urlEl) {
  urlEl.addEventListener("blur", prefetchThumbnail);
  urlEl.addEventListener("change", prefetchThumbnail);
}

// Adicionar prefetch nos botões principais da landing page
(function initLandingButtonsPrefetch() {
  const youtubeUrlInput = document.getElementById("youtubeUrl");
  const processBtn = document.getElementById("processBtn");
  const presetSelect = document.getElementById("presetSelect");

  if (youtubeUrlInput && processBtn) {
    const prefetchFromMainForm = () => {
      const url = youtubeUrlInput.value?.trim();

      // Validar URL e preset antes de tentar prefetch
      if (!url || !isValidYouTubeUrl(url)) {
        // Marcar campo como inválido visualmente (opcional)
        youtubeUrlInput.classList.add("input-error");
        return;
      } else {
        youtubeUrlInput.classList.remove("input-error");
      }

      if (presetSelect && !presetSelect.value) {
        presetSelect.classList.add("input-error");
        return;
      } else if (presetSelect) {
        presetSelect.classList.remove("input-error");
      }

      const videoId = extractVideoId(url);
      if (!videoId) {
        return;
      }

      const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      // Salvar OTIMISTICAMENTE para garantir que chegue na próxima página
      // mesmo se o usuário clicar rápido demais
      sessionStorage.setItem("prefetchedVideoId", videoId);
      sessionStorage.setItem("prefetchedThumbUrl", thumbUrl);

      const img = new Image();
      img.onload = () => {
        // Já salvo otimisticamente
      };
      img.onerror = () => {
        const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        // Atualizar com fallback se falhar
        sessionStorage.setItem("prefetchedThumbUrl", fallbackUrl);

        const imgFallback = new Image();
        imgFallback.onload = () => {
        };
        imgFallback.src = fallbackUrl;
      };
      img.src = thumbUrl;
    };

    // Adicionar eventos ao botão principal (hover/focus)
    processBtn.addEventListener("mouseover", prefetchFromMainForm);
    processBtn.addEventListener("focus", prefetchFromMainForm);

    // Adicionar eventos ao input URL
    youtubeUrlInput.addEventListener("blur", prefetchFromMainForm);
    youtubeUrlInput.addEventListener("change", prefetchFromMainForm);

    // Adicionar eventos ao select de preset
    if (presetSelect) {
      presetSelect.addEventListener("change", prefetchFromMainForm);
      presetSelect.addEventListener("blur", prefetchFromMainForm);
    }
  }
})();

if (form && startBtn) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = (urlEl?.value || "").trim();
    const preset = presetEl?.value;

    // Validação básica
    if (!url || !preset) {
      showError("URL e Preset são obrigatórios");
      return;
    }

    // GARANTIA: Salvar thumbnail no sessionStorage ao submeter
    // Isso cobre casos onde o usuário não passou o mouse ou usou Enter
    try {
      if (isValidYouTubeUrl(url)) {
        const videoId = extractVideoId(url);
        if (videoId) {
          const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          sessionStorage.setItem("prefetchedVideoId", videoId);
          sessionStorage.setItem("prefetchedThumbUrl", thumbUrl);
        }
      }
    } catch (err) {
      console.error("Error saving thumbnail on submit:", err);
    }

    try {
      // Desabilitar botão
      startBtn.disabled = true;
      startBtn.innerHTML = '<span class="btn-text">Carregando...</span>';

      // Fazer requisição POST para criar o job
      const r = await fetch("/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, preset }),
      });

      let payload = null;
      try {
        payload = await r.json();
      } catch (parseError) {
        console.warn("⚠️ Falha ao interpretar resposta do servidor:", parseError);
      }

      if (!r.ok) {
        const errorCode = payload?.error;
        const message = payload?.message || payload?.error || "Erro ao iniciar processamento";
        
        if (errorCode === 'preset_not_available' || errorCode === 'plan_limit_reached') {
          startBtn.disabled = false;
          startBtn.innerHTML = '<span class="btn-text">Processar</span>';
          showPlanModal(message);
          return;
        }
        
        throw new Error(message);
      }

      if (!payload || !payload.id) {
        throw new Error("Resposta inesperada do servidor. Tente novamente.");
      }

      // Transição suave para página de processamento
      transitionToProcessPage(payload.id);
    } catch (err) {
      showError(err.message || "Erro ao processar áudio. Tente novamente.");
      startBtn.disabled = false;
      startBtn.innerHTML = '<span class="btn-text">Processar</span>';
    }
  });
}

function transitionToProcessPage(jobId) {
  // Criar elemento com animação de carregamento
  const loadingScreen = document.createElement("div");
  loadingScreen.className = "transition-loading";
  loadingScreen.innerHTML = `
    <div class="vinyl"></div>
    <div class="loading-text">
      Carregando<span class="loading-dots"></span>
    </div>
  `;
  document.body.appendChild(loadingScreen);

  // Aguardar um pouco e então navegar
  setTimeout(() => {
    window.location.href = `/process?id=${jobId}`;
  }, 800);
}

function showError(message) {
  if (!errorMsg) return;
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
  setTimeout(() => {
    errorMsg.classList.add("hidden");
  }, 5000);
}

// ============ UI Enhancements ============
// Theme toggle (dark default, supports light)
(function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const root = document.documentElement;

  function apply(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      btn.textContent = "🌞";
      localStorage.setItem("theme", "light");
    } else {
      root.removeAttribute("data-theme");
      btn.textContent = "🌚";
      localStorage.setItem("theme", "dark");
    }
  }

  const saved = localStorage.getItem("theme");
  apply(saved === "light" ? "light" : "dark");

  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    apply(next);
  });
})();

// Mobile nav toggle
(function initNavToggle() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return;
  toggle.textContent = "☰";
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!links.classList.contains("open")) return;
    if (e.target === toggle || links.contains(e.target)) return;
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  });
})();
