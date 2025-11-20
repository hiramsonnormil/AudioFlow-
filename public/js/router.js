/**
 * PHONA Router
 * Sistema simples de navegação e proteção de rotas
 */

import { isAuthenticated } from './auth/session.js';

// Rotas protegidas que requerem autenticação
const PROTECTED_ROUTES = ['/app', '/app.html', '/download', '/download.html'];

// Rotas públicas de autenticação
const AUTH_ROUTES = ['/login', '/login.html', '/signup', '/signup.html'];

/**
 * Verificar se rota atual precisa de autenticação
 */
export function isProtectedRoute(path = window.location.pathname) {
  return PROTECTED_ROUTES.some(route => 
    path === route || path.endsWith(route)
  );
}

/**
 * Verificar se rota atual é de autenticação
 */
export function isAuthRoute(path = window.location.pathname) {
  return AUTH_ROUTES.some(route => 
    path === route || path.endsWith(route)
  );
}

/**
 * Redirecionar para uma página
 */
export function navigate(path) {
  window.location.href = path;
}

/**
 * Redirecionar para login
 */
export function redirectToLogin() {
  const currentPath = window.location.pathname;
  
  // Não redirecionar se já estiver em rota de auth
  if (isAuthRoute(currentPath)) {
    return;
  }
  
  // Redirecionar para landing page com parâmetro para abrir modal de login
  navigate('/?requireAuth=true');
}

/**
 * Redirecionar para app
 */
export function redirectToApp() {
  navigate('/html/app.html');
}

/**
 * Redirecionar para download
 */
export function redirectToDownload() {
  navigate('/html/download.html');
}

/**
 * Redirecionar para home/landing
 */
export function redirectToHome() {
  navigate('/html/index.html');
}

/**
 * Guard: proteger rota se não autenticado
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    redirectToLogin();
    return false;
  }
  return true;
}

/**
 * Guard: redirecionar para app se já autenticado
 */
export function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    redirectToApp();
    return false;
  }
  return true;
}

/**
 * Inicializar proteção de rotas
 * Executar no carregamento de cada página
 */
export function initRouteGuard() {
  const currentPath = window.location.pathname;
  
  // Se rota protegida e não autenticado → login
  if (isProtectedRoute(currentPath) && !isAuthenticated()) {
    redirectToLogin();
    return;
  }
  
  // Se rota de auth e já autenticado → app
  if (isAuthRoute(currentPath) && isAuthenticated()) {
    redirectToApp();
    return;
  }
}

export default {
  isProtectedRoute,
  isAuthRoute,
  navigate,
  redirectToLogin,
  redirectToApp,
  redirectToDownload,
  redirectToHome,
  requireAuth,
  redirectIfAuthenticated,
  initRouteGuard,
};
