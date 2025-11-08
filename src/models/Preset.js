/**
 * Model: Preset
 * Define os presets de efeitos de áudio disponíveis
 */

export const PRESETS = {
  SLOWED: {
    id: "SLOWED",
    name: "Slowed",
    emoji: "🐢",
    description: "Tempo 0.88× preservando o pitch",
    enabled: true,
  },
  SPEED_125: {
    id: "SPEED_125",
    name: "Speed Up",
    emoji: "🐇",
    description: "1.25× velocidade com pitch preservado",
    enabled: true,
  },
  ULTRA_SLOWED: {
    id: "ULTRA_SLOWED",
    name: "Ultra Slowed",
    emoji: "🌀",
    description: "Drone etéreo com tempo 0.12×, reverb amplo",
    enabled: true,
  },
  MUFFLED_SLOWED: {
    id: "MUFFLED_SLOWED",
    name: "Muffled Slowed",
    emoji: "🔊",
    description: "80% + passa-baixa 300Hz",
    enabled: true,
  },
  MUFFLED_SPEED: {
    id: "MUFFLED_SPEED",
    name: "Muffled Speed",
    emoji: "⚡",
    description: "125% + passa-baixa 500Hz",
    enabled: true,
  },
  DAYCORE: {
    id: "DAYCORE",
    name: "Daycore",
    emoji: "☀️",
    description: "80% + pitch -4 semitons com reverb leve",
    enabled: true,
  },
  NIGHTCORE: {
    id: "NIGHTCORE",
    name: "Nightcore",
    emoji: "🌙",
    description: "135% + pitch +5-6 semitons",
    enabled: true,
  },
  EIGHT_D: {
    id: "8D",
    name: "8D",
    emoji: "🎧",
    description: "Pan automático lento + reverb suave",
    enabled: true,
  },
};

/**
 * Obtém um preset pelo ID
 */
export function getPreset(presetId) {
  return PRESETS[presetId] || null;
}

/**
 * Lista todos os presets habilitados
 */
export function getEnabledPresets() {
  return Object.values(PRESETS).filter((p) => p.enabled);
}

/**
 * Valida se um preset é válido
 */
export function isValidPreset(presetId) {
  return PRESETS[presetId] && PRESETS[presetId].enabled;
}
