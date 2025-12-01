/**
 * PHONA Login Page
 */

import { apiLogin, getErrorMessage } from '../api.js';
import { saveSession } from './session.js';
import { redirectIfAuthenticated, redirectToApp } from '../router.js';
import { $, getValue, disable, enable } from '../utils/dom.js';

// Redirecionar se já autenticado
redirectIfAuthenticated();

// Elementos
const form = $('#loginForm');
const emailInput = $('#email');
const passwordInput = $('#password');
const togglePasswordBtn = $('#togglePassword');
const eyeIcon = $('#eyeIcon');
const eyeOffIcon = $('#eyeOffIcon');
const errorMessage = $('#errorMessage');
const submitBtn = form?.querySelector('button[type="submit"]');
const btnText = $('#btnText');
const btnSpinner = $('#btnSpinner');

/**
 * Mostrar erro
 */
function showError(message) {
  if (!errorMessage) return;
  errorMessage.textContent = message;
  errorMessage.classList.add('show');
}

/**
 * Esconder erro
 */
function hideError() {
  if (!errorMessage) return;
  errorMessage.classList.remove('show');
  errorMessage.textContent = '';
}

/**
 * Toggle visibilidade da senha
 */
function togglePasswordVisibility() {
  const isPassword = passwordInput.type === 'password';
  
  passwordInput.type = isPassword ? 'text' : 'password';
  eyeIcon.style.display = isPassword ? 'none' : 'block';
  eyeOffIcon.style.display = isPassword ? 'block' : 'none';
  
  togglePasswordBtn.setAttribute(
    'aria-label',
    isPassword ? 'Ocultar senha' : 'Mostrar senha'
  );
}

/**
 * Validar form
 */
function validateForm(email, password) {
  if (!email) {
    showError('Por favor, insira seu e-mail');
    return false;
  }
  
  if (!email.includes('@')) {
    showError('Por favor, insira um e-mail válido');
    return false;
  }
  
  if (!password) {
    showError('Por favor, insira sua senha');
    return false;
  }
  
  return true;
}

/**
 * Submeter form
 */
async function handleSubmit(e) {
  e.preventDefault();
  hideError();
  
  const email = getValue(emailInput);
  const password = getValue(passwordInput);
  
  if (!validateForm(email, password)) {
    return;
  }
  
  // Loading state
  disable(submitBtn);
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-block';
  form.classList.add('loading');
  
  try {
    const response = await apiLogin(email, password);
    
    // Salvar sessão
    saveSession({
      token: response.token,
      user: response.user,
    });
    
    // Pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Redirecionar para app
    redirectToApp();
  } catch (error) {
    console.error('Login error:', error);
    showError(getErrorMessage(error));
    
    // Restaurar form
    enable(submitBtn);
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    form.classList.remove('loading');
    
    // Focar no campo apropriado
    if (error.data?.error === 'invalid_credentials') {
      passwordInput.value = '';
      passwordInput.focus();
    }
  }
}

/**
 * Inicializar
 */
function init() {
  if (!form) {
    console.error('Login form not found');
    return;
  }
  
  // Event listeners
  form.addEventListener('submit', handleSubmit);
  
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
  }
  
  // Focus no email
  emailInput?.focus();
  
  // Enter em qualquer campo submete o form
  [emailInput, passwordInput].forEach(input => {
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSubmit(e);
      }
    });
  });
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
