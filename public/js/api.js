/**
 * PHONA API Client
 * Módulo para comunicação com o backend
 */

const API_BASE = window.location.origin;

/**
 * Utilitário para fazer requisições HTTP
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Adicionar token se existir (usando localStorage para persistência)
  const token = localStorage.getItem('phona:token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    // Para downloads, retornar resposta direta
    if (options.responseType === 'blob') {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * API de Autenticação
 */
export async function apiLogin(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function apiSignup(username, email, password) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

/**
 * API de Jobs
 */
export async function apiCreateJob({ inputUrl, preset }) {
  return request('/api/jobs', {
    method: 'POST',
    body: JSON.stringify({ 
      url: inputUrl, 
      preset 
    }),
  });
}

export async function apiGetJobStatus(jobId) {
  return request(`/api/jobs/${jobId}/status`, {
    method: 'GET',
  });
}

export async function apiGetJobDownload(jobId) {
  return request(`/api/jobs/${jobId}/download`, {
    method: 'GET',
    responseType: 'blob',
  });
}

export async function apiDeleteTempJob(jobId) {
  return request(`/api/jobs/${jobId}/temp`, {
    method: 'DELETE',
  });
}

/**
 * Obter URL de download de um job
 */
export function getDownloadUrl(jobId) {
  return `${API_BASE}/api/jobs/${jobId}/download`;
}

/**
 * Polling helper para status de job
 */
export async function pollJobStatus(jobId, onUpdate, options = {}) {
  const {
    interval = 2000, // 2 segundos
    maxAttempts = 150, // 5 minutos máximo
    onError = null,
  } = options;

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;

        const status = await apiGetJobStatus(jobId);
        
        if (onUpdate) {
          onUpdate(status);
        }

        // Job concluído
        if (status.status === 'DONE') {
          resolve(status);
          return;
        }

        // Job com erro
        if (status.status === 'ERROR') {
          const error = new Error(status.error || 'Processing failed');
          error.jobStatus = status;
          reject(error);
          return;
        }

        // Continuar polling se ainda em progresso
        if (attempts < maxAttempts) {
          setTimeout(poll, interval);
        } else {
          reject(new Error('Polling timeout: job took too long'));
        }
      } catch (error) {
        if (onError) {
          onError(error);
        }
        reject(error);
      }
    };

    poll();
  });
}

/**
 * Helper para tratamento de erros da API
 */
export function getErrorMessage(error) {
  if (error.data?.error) {
    const errorMap = {
      'missing_fields': 'Por favor, preencha todos os campos',
      'email_in_use': 'Este e-mail já está em uso',
      'invalid_credentials': 'E-mail ou senha incorretos',
      'invalid_preset': 'Preset inválido selecionado',
      'url_not_supported': 'URL não suportada. Use links do YouTube',
      'not_found': 'Recurso não encontrado',
      'unauthorized': 'Você precisa fazer login',
    };
    
    return errorMap[error.data.error] || error.data.error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Ocorreu um erro. Tente novamente.';
}

export default {
  apiLogin,
  apiSignup,
  apiCreateJob,
  apiGetJobStatus,
  apiGetJobDownload,
  apiDeleteTempJob,
  getDownloadUrl,
  pollJobStatus,
  getErrorMessage,
};
