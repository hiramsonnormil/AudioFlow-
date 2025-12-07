/**
 * PHONA Modal Authentication with Tabs
 * Controlador do modal de autenticação com tabs Login/Signup
 */

import { apiLogin, apiSignup, getErrorMessage } from '../api.js';
import { saveSession, isAuthenticated } from './session.js';
import { initGoogleAuth, handleOAuthCallback } from './google-auth.js';

// Handle OAuth callback on page load
handleOAuthCallback();

// Elementos do modal
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const modalOverlay = authModal?.querySelector('.modal-overlay');

// Botões de abrir modal
const openLoginBtn = document.getElementById('openLoginBtn');
const openSignupBtn = document.getElementById('openSignupBtn');

// Tabs
const modalTabs = document.querySelector('.modal-tabs');
const tabButtons = document.querySelectorAll('.modal-tab');
const loginTab = document.querySelector('[data-tab="login"]');
const signupTab = document.querySelector('[data-tab="signup"]');

// Título e subtítulo dinâmicos
const modalTitle = document.getElementById('modalTitle');
const modalSubtitle = document.getElementById('modalSubtitle');

// Forms
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Erro único para ambos os forms
const authError = document.getElementById('authError');

// Inputs de Login
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const toggleLoginPassword = document.getElementById('toggleLoginPassword');

// Inputs de Signup
const signupUsername = document.getElementById('signupUsername');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
const toggleSignupPassword = document.getElementById('toggleSignupPassword');
const toggleSignupConfirmPassword = document.getElementById('toggleSignupConfirmPassword');

// Estado atual
let currentTab = 'login';

/**
 * Abrir modal em uma tab específica
 */
function openModal(tab = 'login') {
  if (!authModal) return;

  currentTab = tab;
  switchTab(tab);

  authModal.classList.add('active');
  document.body.classList.add('modal-open');

  // Focus no primeiro input da tab ativa
  setTimeout(() => {
    const activeForm = tab === 'login' ? loginForm : signupForm;
    const firstInput = activeForm?.querySelector('input');
    if (firstInput) firstInput.focus();
  }, 100);
}

/**
 * Fechar modal
 */
function closeModal() {
  if (!authModal) return;
  authModal.classList.add('closing');

  setTimeout(() => {
    authModal.classList.remove('active', 'closing');
    document.body.classList.remove('modal-open');

    // Limpar forms e erros
    loginForm?.reset();
    signupForm?.reset();
    hideError();
  }, 300);
}

/**
 * Trocar entre tabs
 */
function switchTab(tab) {
  currentTab = tab;

  // Atualizar indicador visual
  if (modalTabs) {
    modalTabs.setAttribute('data-active', tab);
  }

  // Atualizar tabs ativas
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Trocar forms
  if (tab === 'login') {
    loginForm?.classList.add('active');
    signupForm?.classList.remove('active');

    // Atualizar título
    if (modalTitle) modalTitle.textContent = 'Bem-vindo de volta';
    if (modalSubtitle) modalSubtitle.textContent = 'Entre para transformar seu áudio';
  } else {
    signupForm?.classList.add('active');
    loginForm?.classList.remove('active');

    // Atualizar título
    if (modalTitle) modalTitle.textContent = 'Criar sua conta';
    if (modalSubtitle) modalSubtitle.textContent = 'Comece a transformar áudio gratuitamente';
  }

  // Limpar erros ao trocar
  hideError();
}

/**
 * Mostrar erro
 */
function showError(message) {
  if (!authError) return;
  authError.textContent = message;
  authError.style.display = 'block';
}

/**
 * Esconder erro
 */
function hideError() {
  if (!authError) return;
  authError.style.display = 'none';
  authError.textContent = '';
}

/**
 * Toggle visibilidade de senha
 */
function setupPasswordToggle(input, button) {
  if (!button || !input) return;

  button.addEventListener('click', () => {
    const eyeIcon = button.querySelector('.eye-icon');
    const eyeOffIcon = button.querySelector('.eye-off-icon');

    if (input.type === 'password') {
      input.type = 'text';
      eyeIcon.style.display = 'none';
      eyeOffIcon.style.display = 'block';
      button.setAttribute('aria-label', 'Ocultar senha');
    } else {
      input.type = 'password';
      eyeIcon.style.display = 'block';
      eyeOffIcon.style.display = 'none';
      button.setAttribute('aria-label', 'Mostrar senha');
    }
  });
}

/**
 * Handle Login
 */
async function handleLogin(e) {
  e.preventDefault();
  hideError();

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    showError('Por favor, preencha todos os campos');
    return;
  }

  if (!email.includes('@')) {
    showError('Por favor, insira um e-mail válido');
    return;
  }

  // Loading state
  loginForm.classList.add('loading');
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const response = await apiLogin(email, password);

    // Salvar sessão
    saveSession({
      token: response.token,
      user: response.user,
    });

    // Pequeno delay para feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    // Fechar modal e voltar para home
    closeModal();

    // Atualizar UI da página
    if (window.location.pathname === '/' || window.location.pathname === '/html/index.html') {
      // Está na landing - recarregar para atualizar o estado de autenticação
      window.location.reload();
    } else {
      // Está em outra página - redirecionar para home
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Login error:', error);
    showError(getErrorMessage(error));

    // Restaurar form
    loginForm.classList.remove('loading');
    submitBtn.disabled = false;

    if (error.data?.error === 'invalid_credentials') {
      loginPassword.value = '';
      loginPassword.focus();
    }
  }
}

/**
 * Handle Signup
 */
async function handleSignup(e) {
  e.preventDefault();
  hideError();

  const username = signupUsername.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value;
  const confirmPassword = signupConfirmPassword.value;

  // Validações
  if (!username || !email || !password || !confirmPassword) {
    showError('Por favor, preencha todos os campos');
    return;
  }

  if (username.length < 3) {
    showError('Nome de usuário deve ter no mínimo 3 caracteres');
    signupUsername.focus();
    return;
  }

  if (!email.includes('@')) {
    showError('Por favor, insira um e-mail válido');
    signupEmail.focus();
    return;
  }

  if (password.length < 8) {
    showError('Senha deve ter no mínimo 8 caracteres');
    signupPassword.focus();
    return;
  }

  if (password !== confirmPassword) {
    showError('As senhas não coincidem');
    signupConfirmPassword.focus();
    return;
  }

  // Loading state
  signupForm.classList.add('loading');
  const submitBtn = signupForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const response = await apiSignup(username, email, password);

    // Salvar sessão (login automático)
    saveSession({
      token: response.token,
      user: response.user,
    });

    // Pequeno delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Fechar modal e voltar para home
    closeModal();

    // Atualizar UI da página
    if (window.location.pathname === '/' || window.location.pathname === '/html/index.html') {
      // Está na landing - recarregar para atualizar o estado de autenticação
      window.location.reload();
    } else {
      // Está em outra página - redirecionar para home
      window.location.href = '/';
    }
  } catch (error) {
    console.error('Signup error:', error);
    showError(getErrorMessage(error));

    // Restaurar form
    signupForm.classList.remove('loading');
    submitBtn.disabled = false;

    if (error.data?.error === 'email_in_use') {
      signupEmail.focus();
    }
  }
}

/**
 * Configurar event listeners dos botões de abrir modal
 */
function setupOpenModalListeners() {
  // Botões desktop
  const openLoginBtn = document.getElementById('openLoginBtn');
  const openSignupBtn = document.getElementById('openSignupBtn');

  // Botões mobile
  const mobileOpenLoginBtn = document.getElementById('mobile-openLoginBtn');
  const mobileOpenSignupBtn = document.getElementById('mobile-openSignupBtn');

  // Abrir modal de login (desktop)
  openLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('login');
  });

  // Abrir modal de signup (desktop)
  openSignupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('signup');
  });

  // Abrir modal de login (mobile)
  mobileOpenLoginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('login');
  });

  // Abrir modal de signup (mobile)
  mobileOpenSignupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('signup');
  });
}

/**
 * Inicializar eventos
 */
function init() {
  setupOpenModalListeners();

  // Initialize Google OAuth only for recovery
  initGoogleAuth('googleRecoveryBtn', 'recovery');

  // Forgot password link - open forgot password modal
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
  const forgotPasswordOverlay = forgotPasswordModal?.querySelector('.modal-overlay');
  const backToLoginLink = document.getElementById('backToLoginLink');

  forgotPasswordLink?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(); // Close auth modal
    setTimeout(() => {
      // Open forgot password modal
      forgotPasswordModal?.classList.add('active');
      document.body.classList.add('modal-open');
    }, 300);
  });

  // Close forgot password modal
  closeForgotPasswordModal?.addEventListener('click', () => {
    forgotPasswordModal?.classList.add('closing');
    setTimeout(() => {
      forgotPasswordModal?.classList.remove('active', 'closing');
      document.body.classList.remove('modal-open');
    }, 300);
  });

  // Close on overlay click
  forgotPasswordOverlay?.addEventListener('click', () => {
    forgotPasswordModal?.classList.add('closing');
    setTimeout(() => {
      forgotPasswordModal?.classList.remove('active', 'closing');
      document.body.classList.remove('modal-open');
    }, 300);
  });

  // Back to login link
  backToLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal?.classList.add('closing');
    setTimeout(() => {
      forgotPasswordModal?.classList.remove('active', 'closing');
      openModal('login'); // Reopen login modal
    }, 300);
  });

  // Fechar modal
  closeAuthModal?.addEventListener('click', closeModal);

  // Fechar ao clicar no overlay
  modalOverlay?.addEventListener('click', closeModal);

  // Trocar entre tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // ESC para fechar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && authModal?.classList.contains('active')) {
      closeModal();
    }
  });

  // Setup password toggles
  setupPasswordToggle(loginPassword, toggleLoginPassword);
  setupPasswordToggle(signupPassword, toggleSignupPassword);
  setupPasswordToggle(signupConfirmPassword, toggleSignupConfirmPassword);

  // Forms submit
  loginForm?.addEventListener('submit', handleLogin);
  signupForm?.addEventListener('submit', handleSignup);

  // Validação em tempo real de senha matching
  signupConfirmPassword?.addEventListener('input', () => {
    if (signupConfirmPassword.value && signupPassword.value !== signupConfirmPassword.value) {
      signupConfirmPassword.setCustomValidity('As senhas não coincidem');
    } else {
      signupConfirmPassword.setCustomValidity('');
    }
  });

  signupPassword?.addEventListener('input', () => {
    if (signupConfirmPassword.value && signupPassword.value !== signupConfirmPassword.value) {
      signupConfirmPassword.setCustomValidity('As senhas não coincidem');
    } else {
      signupConfirmPassword.setCustomValidity('');
    }
  });
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Exportar funções para uso em outras páginas
export { openModal, closeModal, setupOpenModalListeners };
