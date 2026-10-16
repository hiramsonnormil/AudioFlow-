/**
 * PHONA Navbar Authentication State
 * Atualiza a navbar baseado no estado de autenticação
 */

import { isAuthenticated, clearSession, getUserInitial } from './auth/session.js';
import { setupOpenModalListeners } from './auth/modal-auth.js';
import { confirmLogout } from './confirm-modal.js';

/**
 * Atualizar navbar baseado no estado de autenticação
 */
function updateNavbar() {
  const navLinks = document.querySelector('.nav-links');
  const mobileMenuNav = document.querySelector('.mobile-menu-nav');

  if (!navLinks) {
    console.warn('⚠️ [NAVBAR] .nav-links não encontrado');
    return;
  }

  if (isAuthenticated()) {
    const userInitial = getUserInitial();

    // Substituir botões de login/signup por user info e logout - DESKTOP
    navLinks.innerHTML = `
      <a href="#effects" class="nav-link">Efeitos</a>
      <a href="#how" class="nav-link">Como funciona</a>
      <a href="/html/recents.html" class="nav-link" id="nav-recents">📂 Meus Processamentos</a>
      <a href="/account" class="nav-link nav-link-account nav-user" style="display: flex; align-items: center; gap: 0.5rem;">
        <span class="nav-user-icon" style="width: 32px; height: 32px; background: linear-gradient(135deg, #7B61FF, #00E0FF); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; color: #fff;">${userInitial}</span>
        <span class="nav-user-name" style="font-weight: 600;">Conta</span>
      </a>
      <button class="nav-link nav-link-logout" id="navLogoutBtn">Sair</button>
    `;

    // Atualizar menu mobile também
    if (mobileMenuNav) {
      mobileMenuNav.innerHTML = `
        <a href="#effects" class="mobile-nav-link">Efeitos</a>
        <a href="#how" class="mobile-nav-link">Como funciona</a>
        <a href="/html/recents.html" class="mobile-nav-link" id="mobile-nav-recents">📂 Meus Processamentos</a>
        <div class="mobile-menu-divider"></div>
        <a href="/account" class="mobile-nav-link" style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px; margin-bottom: 0.5rem;">
          <span style="width: 40px; height: 40px; background: linear-gradient(135deg, #7B61FF, #00E0FF); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.1rem;">${userInitial}</span>
          <div style="display: flex; flex-direction: column; gap: 0.25rem;">
            <span style="color: var(--text-primary); font-weight: 600;">Conta</span>
          </div>
        </a>
        <button class="mobile-nav-link mobile-logout-btn" id="mobileNavLogoutBtn" style="width: 100%; text-align: left; background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3); color: #ff4d4d;">Sair</button>
      `;

      // Adicionar listener no botão de logout mobile
      const mobileLogoutBtn = document.getElementById('mobileNavLogoutBtn');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', handleLogout);
      }
    }

    // Adicionar listener no botão de logout desktop
    const logoutBtn = document.getElementById('navLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  } else {
    // Mostrar botões de login/signup - DESKTOP
    navLinks.innerHTML = `
      <a href="#effects" class="nav-link">Efeitos</a>
      <a href="#how" class="nav-link">Como funciona</a>
      <a href="#" class="nav-link" id="openLoginBtn">Entrar</a>
      <a href="#" class="nav-link nav-link-cta" id="openSignupBtn">Criar conta</a>
    `;

    // Mostrar botões de login/signup - MOBILE
    if (mobileMenuNav) {
      mobileMenuNav.innerHTML = `
        <a href="#effects" class="mobile-nav-link">Efeitos</a>
        <a href="#how" class="mobile-nav-link">Como funciona</a>
        <div class="mobile-menu-divider"></div>
        <a href="#" class="mobile-nav-link" id="mobile-openLoginBtn">Entrar</a>
        <a href="#" class="mobile-nav-link mobile-nav-link-cta" id="mobile-openSignupBtn">Criar conta</a>
      `;
    }

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
  // Mostrar modal de confirmação bonito
  const confirmed = await confirmLogout();

  if (!confirmed) {
    return;
  }

  clearSession();

  // Recarregar página para atualizar UI
  window.location.reload();
}

/**
 * Inicializar
 */
function init() {
  updateNavbar();

  // Escutar mudanças no localStorage (login/logout em outra aba)
  window.addEventListener('storage', (e) => {
    if (e.key === 'phona:token' || e.key === null) {
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
