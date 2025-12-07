/**
 * PHONA Plans Page
 * Gerencia interações na página de planos
 */

import { isAuthenticated } from './auth/session.js';
import { setupOpenModalListeners } from './auth/modal-auth.js';

/**
 * Inicializar botões de planos
 */
function initPlanButtons() {
  const freePlanBtn = document.getElementById('freePlanBtn');
  const premiumPlanBtn = document.getElementById('premiumPlanBtn');

  if (freePlanBtn) {
    freePlanBtn.addEventListener('click', handleFreePlanClick);
  }

  if (premiumPlanBtn) {
    premiumPlanBtn.addEventListener('click', handlePremiumPlanClick);
  }
}

/**
 * Handler para botão do plano Free
 */
function handleFreePlanClick(e) {
  e.preventDefault();

  if (!isAuthenticated()) {
    // Se não estiver logado, abrir modal de login/criar conta
    const loginBtn = document.getElementById('openLoginBtn');
    if (loginBtn) {
      loginBtn.click();
    }
  } else {
    // Se estiver logado, redirecionar para o processador
    window.location.href = '/html/index.html#processor';
  }
}

/**
 * Handler para botão do plano Premium
 */
function handlePremiumPlanClick(e) {
  e.preventDefault();

  if (!isAuthenticated()) {
    // Se não estiver logado, abrir modal de login/criar conta
    const signupBtn = document.getElementById('openSignupBtn');
    if (signupBtn) {
      signupBtn.click();
    }
  } else {
    // Se estiver logado, redirecionar para o processador
    window.location.href = '/html/index.html#processor';
  }
}

/**
 * Inicializar página
 */
function init() {
  initPlanButtons();
  
  // Garantir que os listeners do modal estão configurados
  setTimeout(() => {
    setupOpenModalListeners();
  }, 100);
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { };

