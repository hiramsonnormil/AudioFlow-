/**
 * PHONA Storage Utilities
 * Helpers para localStorage e sessionStorage
 */

/**
 * Salvar item no localStorage com JSON
 */
export function setLocal(key, value) {
  try {
    const json = JSON.stringify(value);
    localStorage.setItem(key, json);
    return true;
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
    return false;
  }
}

/**
 * Obter item do localStorage com parse JSON
 */
export function getLocal(key, defaultValue = null) {
  try {
    const json = localStorage.getItem(key);
    if (json === null) return defaultValue;
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to read from localStorage:', e);
    return defaultValue;
  }
}

/**
 * Remover item do localStorage
 */
export function removeLocal(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('Failed to remove from localStorage:', e);
    return false;
  }
}

/**
 * Limpar todo localStorage
 */
export function clearLocal() {
  try {
    localStorage.clear();
    return true;
  } catch (e) {
    console.error('Failed to clear localStorage:', e);
    return false;
  }
}

/**
 * Salvar item no sessionStorage com JSON
 */
export function setSession(key, value) {
  try {
    const json = JSON.stringify(value);
    sessionStorage.setItem(key, json);
    return true;
  } catch (e) {
    console.error('Failed to save to sessionStorage:', e);
    return false;
  }
}

/**
 * Obter item do sessionStorage com parse JSON
 */
export function getSession(key, defaultValue = null) {
  try {
    const json = sessionStorage.getItem(key);
    if (json === null) return defaultValue;
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to read from sessionStorage:', e);
    return defaultValue;
  }
}

/**
 * Remover item do sessionStorage
 */
export function removeSession(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('Failed to remove from sessionStorage:', e);
    return false;
  }
}

/**
 * Limpar todo sessionStorage
 */
export function clearSession() {
  try {
    sessionStorage.clear();
    return true;
  } catch (e) {
    console.error('Failed to clear sessionStorage:', e);
    return false;
  }
}

/**
 * Verificar se localStorage está disponível
 */
export function isLocalStorageAvailable() {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Verificar se sessionStorage está disponível
 */
export function isSessionStorageAvailable() {
  try {
    const test = '__sessionStorage_test__';
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

export default {
  setLocal,
  getLocal,
  removeLocal,
  clearLocal,
  setSession,
  getSession,
  removeSession,
  clearSession,
  isLocalStorageAvailable,
  isSessionStorageAvailable,
};
