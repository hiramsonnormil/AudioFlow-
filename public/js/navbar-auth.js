/**
 * PHONA Navbar Authentication State
 * Atualiza a navbar baseado no estado de autenticação
 */

import { isAuthenticated, getUser, clearSession } from './auth/session.js';
import { setupOpenModalListeners } from './auth/modal-auth.js';
import { confirmLogout } from './confirm-modal.js';

/**
 * Atualizar navbar baseado no estado de autenticação
 */
function updateNavbar() {
  const navLinks = document.querySelector('.nav-links');

  if (!navLinks) {
    console.warn('⚠️ [NAVBAR] .nav-links não encontrado');
    return;
  }

  if (isAuthenticated()) {
    const user = getUser();
    const userName = user?.username || user?.email?.split('@')[0] || 'Usuário';

    console.log('✅ [NAVBAR] Usuário autenticado:', userName);

    // Substituir botões de login/signup por user info e logout
    navLinks.innerHTML = `
      <a href="#effects" class="nav-link">Efeitos</a>
      <a href="#how" class="nav-link">Como funciona</a>
      <a href="/html/recents.html" class="nav-link">📂 Meus Processamentos</a>
      <span class="nav-user">
        <span class="nav-user-icon">👤</span>
        <span class="nav-user-name">${userName}</span>
      </span>
      <button class="nav-link nav-link-logout" id="navLogoutBtn">Sair</button>
    `;

    // Adicionar listener no botão de logout
    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  } else {
    console.log('❌ [NAVBAR] Usuário não autenticado');

    // Mostrar botões de login/signup
    navLinks.innerHTML = `
      <a href="#effects" class="nav-link">Efeitos</a>
      <a href="#how" class="nav-link">Como funciona</a>
      <a href="#" class="nav-link" id="openLoginBtn">Entrar</a>
      <a href="#" class="nav-link nav-link-cta" id="openSignupBtn">Criar conta</a>
    `;

    // Re-adicionar event listeners dos botões de modal
    setTimeout(() => {
      setupOpenModalListeners();
    }, 0);
  }
}

/**
 * Fazer logout
 */
async function handleLogout() {
  console.log('🚪 [NAVBAR] Solicitando confirmação de logout...');

  // Mostrar modal de confirmação bonito
  const confirmed = await confirmLogout();

  if (!confirmed) {
    console.log('❌ [NAVBAR] Logout cancelado pelo usuário');
    return;
  }

  console.log('🚪 [NAVBAR] Fazendo logout...');

  clearSession();

  // Recarregar página para atualizar UI
  window.location.reload();
}

/**
 * Inicializar
 */
function init() {
  console.log('🔧 [NAVBAR] Inicializando atualização de navbar...');
  updateNavbar();

  // Escutar mudanças no localStorage (login/logout em outra aba)
  window.addEventListener('storage', (e) => {
    if (e.key === 'phona:token' || e.key === null) {
      console.log('🔄 [NAVBAR] Mudança detectada no localStorage');
      updateNavbar();
    }
  });
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { updateNavbar };
