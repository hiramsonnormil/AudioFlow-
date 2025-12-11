/**
 * Validações centralizadas de áudio
 * Consolidando validações que estavam duplicadas em múltiplos lugares
 */

import { 
  isDurationTooLong, 
  buildDurationLimitMessage 
} from '../config/audioLimits.js';

/**
 * Valida a duração do áudio antes do processamento
 * Centraliza a lógica que estava duplicada em ProcessController e AudioProcessingService
 * 
 * @param {number} duration - Duração em segundos
 * @param {string} jobId - ID do job (opcional, para logging)
 * @throws {Error} Se a duração exceder o limite
 */
export function validateAudioDuration(duration, jobId = null) {
  const normalizedDuration =
    typeof duration === 'number' && Number.isFinite(duration)
      ? duration
      : parseFloat(duration) || 0;

  if (isDurationTooLong(normalizedDuration)) {
    throw new Error(buildDurationLimitMessage(normalizedDuration));
  }

  return normalizedDuration;
}

/**
 * Valida a entrada de processamento (URL e preset)
 * 
 * @param {string} url - URL do vídeo
 * @param {string} preset - Nome do preset
 * @param {Function} isYouTubeUrl - Função de validação de URL do YouTube
 * @param {Function} isValidPreset - Função de validação de preset
 * @returns {Object} Objeto com validações ou erro
 */
export function validateProcessInput(url, preset, isYouTubeUrl, isValidPreset) {
  if (!url || !preset) {
    return { valid: false, error: 'missing_parameters', message: 'URL e preset são obrigatórios' };
  }

  if (!isYouTubeUrl(url)) {
    return { valid: false, error: 'invalid_url', message: 'URL deve ser do YouTube' };
  }

  if (!isValidPreset(preset)) {
    return { valid: false, error: 'invalid_preset', message: 'Preset inválido' };
  }

  return { valid: true };
}
