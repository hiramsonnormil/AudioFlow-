/**
 * PHONA Session Manager
 * Gerencia autenticação e sessão do usuário no frontend
 * Usa localStorage para persistir sessão entre recarregamentos
 */

const TOKEN_KEY = 'phona:token';
const USER_KEY = 'phona:user';

/**
 * Salvar sessão do usuário (persiste no localStorage)
 */
export function saveSession({ token, user }) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  console.log('✅ Sessão salva no localStorage');
}

/**
 * Obter token da sessão
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Obter dados do usuário da sessão
 */
export function getUser() {
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (e) {
    console.error('Failed to parse user data:', e);
    return null;
  }
}

/**
 * Verificar se usuário está autenticado
 */
export function isAuthenticated() {
  return !!getToken();
}

/**
 * Limpar sessão (logout)
 */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Também limpar job temporário do plano Free
  localStorage.removeItem('phona:free:downloadJob');
  
  console.log('🚪 Sessão limpa - usuário deslogado');
}

/**
 * Obter inicial do username para avatar
 */
export function getUserInitial() {
  const user = getUser();
  if (!user || !user.username) return '?';
  
  return user.username.charAt(0).toUpperCase();
}

/**
 * Verificar se usuário é Free
 */
export function isFreeUser() {
  const user = getUser();
  return user?.plan === 'free';
}

/**
 * Obter plano do usuário
 */
export function getUserPlan() {
  const user = getUser();
  return user?.plan || 'free';
}

export default {
  saveSession,
  getToken,
  getUser,
  isAuthenticated,
  clearSession,
  getUserInitial,
  isFreeUser,
  getUserPlan,
};
