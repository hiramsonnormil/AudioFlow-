/**
 * PHONA DOM Utilities
 * Helpers para manipulação de DOM
 */

/**
 * Selecionar elemento
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Selecionar múltiplos elementos
 */
export function $$(selector, parent = document) {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Criar elemento com atributos e children
 */
export function createElement(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  });
  
  children.forEach(child => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  
  return element;
}

/**
 * Mostrar elemento
 */
export function show(element) {
  if (!element) return;
  element.style.display = '';
  element.classList.remove('hidden');
}

/**
 * Esconder elemento
 */
export function hide(element) {
  if (!element) return;
  element.style.display = 'none';
  element.classList.add('hidden');
}

/**
 * Toggle visibilidade
 */
export function toggle(element) {
  if (!element) return;
  
  if (element.style.display === 'none' || element.classList.contains('hidden')) {
    show(element);
  } else {
    hide(element);
  }
}

/**
 * Adicionar classe
 */
export function addClass(element, className) {
  if (!element) return;
  element.classList.add(className);
}

/**
 * Remover classe
 */
export function removeClass(element, className) {
  if (!element) return;
  element.classList.remove(className);
}

/**
 * Toggle classe
 */
export function toggleClass(element, className) {
  if (!element) return;
  element.classList.toggle(className);
}

/**
 * Verificar se tem classe
 */
export function hasClass(element, className) {
  if (!element) return false;
  return element.classList.contains(className);
}

/**
 * Adicionar event listener com cleanup
 */
export function on(element, event, handler, options) {
  if (!element) return () => {};
  
  element.addEventListener(event, handler, options);
  
  return () => {
    element.removeEventListener(event, handler, options);
  };
}

/**
 * Remover todos os filhos de um elemento
 */
export function empty(element) {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Obter valor de input
 */
export function getValue(input) {
  if (!input) return '';
  return input.value.trim();
}

/**
 * Definir valor de input
 */
export function setValue(input, value) {
  if (!input) return;
  input.value = value;
}

/**
 * Focar em elemento
 */
export function focus(element) {
  if (!element) return;
  setTimeout(() => element.focus(), 0);
}

/**
 * Desabilitar elemento
 */
export function disable(element) {
  if (!element) return;
  element.disabled = true;
}

/**
 * Habilitar elemento
 */
export function enable(element) {
  if (!element) return;
  element.disabled = false;
}

/**
 * Scroll suave para elemento
 */
export function scrollTo(element, options = {}) {
  if (!element) return;
  
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    ...options,
  });
}

/**
 * Wait (async delay)
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function
 */
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Escape HTML
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Formatar data
 */
export function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formatar tempo
 */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default {
  $,
  $$,
  createElement,
  show,
  hide,
  toggle,
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  on,
  empty,
  getValue,
  setValue,
  focus,
  disable,
  enable,
  scrollTo,
  wait,
  debounce,
  throttle,
  escapeHtml,
  formatDate,
  formatTime,
};
