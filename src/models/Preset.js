/**
 * Model: Preset
 * Define os presets de efeitos de áudio disponíveis
 */

export const PRESETS = {
  SLOWED: {
    id: "SLOWED",
    name: "Slowed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round"/></svg>',
    description: "Tempo 0.88× preservando o pitch",
    enabled: true,
  },
  SLOWED_REVERB: {
    id: "SLOWED_REVERB",
    name: "Slowed + Reverb",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="12" r="7" opacity="0.6"/><circle cx="12" cy="12" r="4"/><path d="M12 6v6l4 2" stroke-linecap="round"/></svg>',
    description: "Slowed 0.88× com reverb profissional e redução de ruído",
    enabled: true,
  },
  SPEED_125: {
    id: "SPEED_125",
    name: "Speed Up",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    description: "1.25× velocidade com pitch preservado",
    enabled: true,
  },
  ULTRA_SLOWED: {
    id: "ULTRA_SLOWED",
    name: "Ultra Slowed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    description: "Drone etéreo com tempo 0.12×, reverb amplo",
    enabled: true,
  },
  MUFFLED_SLOWED: {
    id: "MUFFLED_SLOWED",
    name: "Muffled Slowed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/></svg>',
    description: "Lento abafado com lowpass 3000Hz",
    enabled: true,
  },
  MUFFLED_SPEED: {
    id: "MUFFLED_SPEED",
    name: "Muffled Speed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke-linecap="round"/></svg>',
    description: "Rápido abafado com lowpass 3000Hz",
    enabled: true,
  },
  DAYCORE: {
    id: "DAYCORE",
    name: "Daycore",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M21 12h2M1 12h2m15.364-7.364 1.414-1.414M4.222 19.778l1.414-1.414m12.728 0 1.414 1.414M4.222 4.222l1.414 1.414" stroke-linecap="round"/></svg>',
    description: "Lento + pitch grave (0.80×) melancólico",
    enabled: true,
  },
  NIGHTCORE: {
    id: "NIGHTCORE",
    name: "Nightcore",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke-linejoin="round"/></svg>',
    description: "Rápido + pitch agudo (1.25×) energético",
    enabled: true,
  },
  PHONA: {
    id: "PHONA",
    name: "Phona",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    description: "Efeito telefone (300Hz-3400Hz)",
    enabled: true,
  },
  ECHO: {
    id: "ECHO",
    name: "Echo",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 7v10M7 7v10M22 12h-2M4 12H2" stroke-linecap="round"/></svg>',
    description: "Eco clássico com delay 800ms",
    enabled: true,
  },
  REVERB: {
    id: "REVERB",
    name: "Reverb",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L2 7 L12 12 L22 7 L12 2z" stroke-linejoin="round"/><path d="M2 17 L12 22 L22 17" stroke-linecap="round" opacity="0.6"/><path d="M2 12 L12 17 L22 12" stroke-linecap="round" opacity="0.8"/></svg>',
    description: "Reverberação atmosférica espacial",
    enabled: true,
  },
  BASS_BOOST: {
    id: "BASS_BOOST",
    name: "Bass Boost",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13M9 13c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm12 0c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/></svg>',
    description: "Graves potentes +8dB sem distorção",
    enabled: true,
  },
  ROBOT_VOICE: {
    id: "ROBOT_VOICE",
    name: "Robot Voice",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 12h.01M15 12h.01M9 16h6" stroke-linecap="round"/><path d="M12 8V4M8 4h8" stroke-linecap="round"/></svg>',
    description: "Voz robótica metálica sintética",
    enabled: true,
  },
  "8D": {
    id: "8D",
    name: "8D",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="2 4"/><circle cx="12" cy="12" r="6" stroke-dasharray="2 4"/><circle cx="12" cy="12" r="2"/></svg>',
    description: "Som girando 360° na cabeça",
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
