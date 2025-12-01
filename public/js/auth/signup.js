/**
 * PHONA Signup Page
 */

import { apiSignup, getErrorMessage } from '../api.js';
import { saveSession } from './session.js';
import { redirectIfAuthenticated, redirectToApp } from '../router.js';
import { $, getValue, disable, enable } from '../utils/dom.js';

// Redirecionar se já autenticado
redirectIfAuthenticated();

// Elementos
const form = $('#signupForm');
const usernameInput = $('#username');
const emailInput = $('#email');
const passwordInput = $('#password');
const confirmPasswordInput = $('#confirmPassword');
const togglePasswordBtn = $('#togglePassword');
const toggleConfirmPasswordBtn = $('#toggleConfirmPassword');
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
function setupPasswordToggle(input, btn, eyeIcon, eyeOffIcon) {
  if (!btn) return;
  
  btn.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';
    eyeIcon.style.display = isPassword ? 'none' : 'block';
    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
    
    btn.setAttribute(
      'aria-label',
      isPassword ? 'Ocultar senha' : 'Mostrar senha'
    );
  });
}

/**
 * Validar form
 */
function validateForm(username, email, password, confirmPassword) {
  if (!username) {
    showError('Por favor, insira um nome de usuário');
    usernameInput.focus();
    return false;
  }
  
  if (username.length < 3) {
    showError('Nome de usuário deve ter no mínimo 3 caracteres');
    usernameInput.focus();
    return false;
  }
  
  if (!email) {
    showError('Por favor, insira seu e-mail');
    emailInput.focus();
    return false;
  }
  
  if (!email.includes('@')) {
    showError('Por favor, insira um e-mail válido');
    emailInput.focus();
    return false;
  }
  
  if (!password) {
    showError('Por favor, insira uma senha');
    passwordInput.focus();
    return false;
  }
  
  if (password.length < 8) {
    showError('Senha deve ter no mínimo 8 caracteres');
    passwordInput.focus();
    return false;
  }
  
  if (!confirmPassword) {
    showError('Por favor, confirme sua senha');
    confirmPasswordInput.focus();
    return false;
  }
  
  if (password !== confirmPassword) {
    showError('As senhas não coincidem');
    confirmPasswordInput.focus();
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
  
  const username = getValue(usernameInput);
  const email = getValue(emailInput);
  const password = getValue(passwordInput);
  const confirmPassword = getValue(confirmPasswordInput);
  
  if (!validateForm(username, email, password, confirmPassword)) {
    return;
  }
  
  // Loading state
  disable(submitBtn);
  btnText.style.display = 'none';
  btnSpinner.style.display = 'inline-block';
  form.classList.add('loading');
  
  try {
    const response = await apiSignup(username, email, password);
    
    // Salvar sessão (login automático)
    saveSession({
      token: response.token,
      user: response.user,
    });
    
    // Pequeno delay para feedback visual
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Redirecionar para app
    redirectToApp();
  } catch (error) {
    console.error('Signup error:', error);
    showError(getErrorMessage(error));
    
    // Restaurar form
    enable(submitBtn);
    btnText.style.display = 'inline';
    btnSpinner.style.display = 'none';
    form.classList.remove('loading');
    
    // Focar no campo apropriado
    if (error.data?.error === 'email_in_use') {
      emailInput.focus();
    }
  }
}

/**
 * Validação em tempo real de confirmação de senha
 */
function setupPasswordMatch() {
  confirmPasswordInput?.addEventListener('input', () => {
    const password = getValue(passwordInput);
    const confirmPassword = getValue(confirmPasswordInput);
    
    if (confirmPassword && password !== confirmPassword) {
      confirmPasswordInput.setCustomValidity('As senhas não coincidem');
    } else {
      confirmPasswordInput.setCustomValidity('');
    }
  });
  
  passwordInput?.addEventListener('input', () => {
    const password = getValue(passwordInput);
    const confirmPassword = getValue(confirmPasswordInput);
    
    if (confirmPassword && password !== confirmPassword) {
      confirmPasswordInput.setCustomValidity('As senhas não coincidem');
    } else {
      confirmPasswordInput.setCustomValidity('');
    }
  });
}

/**
 * Inicializar
 */
function init() {
  if (!form) {
    console.error('Signup form not found');
    return;
  }
  
  // Event listeners
  form.addEventListener('submit', handleSubmit);
  
  // Password toggles
  setupPasswordToggle(
    passwordInput,
    togglePasswordBtn,
    $('#eyeIcon'),
    $('#eyeOffIcon')
  );
  
  setupPasswordToggle(
    confirmPasswordInput,
    toggleConfirmPasswordBtn,
    $('#eyeIcon2'),
    $('#eyeOffIcon2')
  );
  
  // Validação de senha matching
  setupPasswordMatch();
  
  // Focus no username
  usernameInput?.focus();
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
