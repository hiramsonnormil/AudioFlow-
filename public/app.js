const form = document.getElementById("form");
const urlEl = document.getElementById("url");
const presetEl = document.getElementById("preset");
const startBtn = document.getElementById("start");
const errorMsg = document.getElementById("errorMsg");

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

// Função para validar URL do YouTube
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

// Prefetch de thumbnail quando mouse entra no botão
startBtn.addEventListener("mouseover", () => {
  const url = urlEl.value.trim();

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
  console.log("Prefetching thumbnail for video:", videoId);
  const thumbUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  const img = new Image();
  img.onload = () => {
    console.log("Thumbnail prefetched successfully");
    sessionStorage.setItem("prefetchedVideoId", videoId);
    sessionStorage.setItem("prefetchedThumbUrl", thumbUrl);
  };
  img.onerror = () => {
    console.log("maxresdefault failed, trying hqdefault");
    const fallbackUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const imgFallback = new Image();
    imgFallback.onload = () => {
      console.log("Fallback thumbnail prefetched");
      sessionStorage.setItem("prefetchedVideoId", videoId);
      sessionStorage.setItem("prefetchedThumbUrl", fallbackUrl);
    };
    imgFallback.src = fallbackUrl;
  };
  img.src = thumbUrl;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlEl.value.trim();
  const preset = presetEl.value;

  // Validação básica
  if (!url || !preset) {
    showError("URL e Preset são obrigatórios");
    return;
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
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "server error");

    // Transição suave para página de processamento
    transitionToProcessPage(j.id);
  } catch (err) {
    showError("Erro: " + err.message);
    startBtn.disabled = false;
    startBtn.innerHTML = '<span class="btn-text">Processar</span>';
  }
});

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
    window.location.href = `/process.html?id=${jobId}`;
  }, 800);
}

function showError(message) {
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
