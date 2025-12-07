export const MAX_AUDIO_DURATION_MINUTES = 20;
export const MAX_AUDIO_DURATION_SECONDS = MAX_AUDIO_DURATION_MINUTES * 60;

export function isDurationTooLong(durationSec) {
  if (typeof durationSec !== 'number' || Number.isNaN(durationSec)) {
    return false;
  }
  return durationSec > MAX_AUDIO_DURATION_SECONDS;
}

export function formatDurationForDisplay(durationSec) {
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec)) {
    return 'tempo desconhecido';
  }

  const totalSeconds = Math.max(0, Math.round(durationSec));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (minutes > 0) {
    parts.push(`${minutes} minuto${minutes !== 1 ? 's' : ''}`);
  }
  if (seconds > 0) {
    parts.push(`${seconds} segundo${seconds !== 1 ? 's' : ''}`);
  }

  if (parts.length === 0) {
    return 'menos de 1 segundo';
  }

  return parts.join(' e ');
}

export function buildDurationLimitMessage(durationSec) {
  const formattedDuration = formatDurationForDisplay(durationSec);
  return `Áudio muito longo. Processamos apenas vídeos de até ${MAX_AUDIO_DURATION_MINUTES} minutos. O vídeo informado tem ${formattedDuration}.`;
}
