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
    planLabel: "Todos",
    minPlan: "free",
    enabled: true,
  },
  SLOWED_REVERB: {
    id: "SLOWED_REVERB",
    name: "Slowed + Reverb",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" opacity="0.3"/><circle cx="12" cy="12" r="7" opacity="0.6"/><circle cx="12" cy="12" r="4"/><path d="M12 6v6l4 2" stroke-linecap="round"/></svg>',
    description: "Slowed 0.88× com reverb profissional e redução de ruído",
    planLabel: "Todos",
    minPlan: "free",
    enabled: true,
  },
  SPEED_125: {
    id: "SPEED_125",
    name: "Speed Up",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    description: "1.25× velocidade com pitch preservado",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  ULTRA_SLOWED: {
    id: "ULTRA_SLOWED",
    name: "Ultra Slowed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    description: "Drone etéreo com tempo 0.12×, reverb amplo",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  MUFFLED_SLOWED: {
    id: "MUFFLED_SLOWED",
    name: "Muffled Slowed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke-linecap="round"/></svg>',
    description: "Lento abafado com lowpass 3000Hz",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  MUFFLED_SPEED: {
    id: "MUFFLED_SPEED",
    name: "Muffled Speed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" stroke-linecap="round"/></svg>',
    description: "Rápido abafado com lowpass 3000Hz",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  DAYCORE: {
    id: "DAYCORE",
    name: "Daycore",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M21 12h2M1 12h2m15.364-7.364 1.414-1.414M4.222 19.778l1.414-1.414m12.728 0 1.414 1.414M4.222 4.222l1.414 1.414" stroke-linecap="round"/></svg>',
    description: "Lento + pitch grave (0.80×) melancólico",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  NIGHTCORE: {
    id: "NIGHTCORE",
    name: "Nightcore",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke-linejoin="round"/></svg>',
    description: "Rápido + pitch agudo (1.25×) energético",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  PHONA: {
    id: "PHONA",
    name: "Phona",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    description: "Efeito telefone (300Hz-3400Hz)",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  ECHO: {
    id: "ECHO",
    name: "Echo",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 7v10M7 7v10M22 12h-2M4 12H2" stroke-linecap="round"/></svg>',
    description: "Eco clássico com delay 800ms",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  REVERB: {
    id: "REVERB",
    name: "Reverb",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 L2 7 L12 12 L22 7 L12 2z" stroke-linejoin="round"/><path d="M2 17 L12 22 L22 17" stroke-linecap="round" opacity="0.6"/><path d="M2 12 L12 17 L22 12" stroke-linecap="round" opacity="0.8"/></svg>',
    description: "Reverberação atmosférica espacial",
    planLabel: "Pro/Master",
    minPlan: "voz_pro",
    enabled: true,
  },
  BASS_BOOST: {
    id: "BASS_BOOST",
    name: "Bass Boost",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13M9 13c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zm12 0c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/></svg>',
    description: "Graves potentes +8dB sem distorção",
    planLabel: "Master",
    minPlan: "voz_master",
    enabled: true,
  },
  ROBOT_VOICE: {
    id: "ROBOT_VOICE",
    name: "Robot Voice",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 12h.01M15 12h.01M9 16h6" stroke-linecap="round"/><path d="M12 8V4M8 4h8" stroke-linecap="round"/></svg>',
    description: "Voz robótica metálica sintética",
    planLabel: "Master",
    minPlan: "voz_master",
    enabled: true,
  },
  "8D": {
    id: "8D",
    name: "8D",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-dasharray="2 4"/><circle cx="12" cy="12" r="6" stroke-dasharray="2 4"/><circle cx="12" cy="12" r="2"/></svg>',
    description: "Som girando 360° na cabeça",
    planLabel: "Master",
    minPlan: "voz_master",
    enabled: true,
  },
  BABY_VOICE: {
    id: "BABY_VOICE",
    name: "Baby Voice",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 12c-3 0-5 2-5 4" stroke-linecap="round"/></svg>',
    description: "Voz aguda fofinha estilo TikTok. Pitch +35%",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  DEEP_VOICE: {
    id: "DEEP_VOICE",
    name: "Deep Voice",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10v1a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-1A10 10 0 0 1 12 2z"/><path d="M8 14v4m8-4v4" stroke-linecap="round"/></svg>',
    description: "Voz grave cinematográfica. Pitch -20%",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  VAPORWAVE_CLEAN: {
    id: "VAPORWAVE_CLEAN",
    name: "Vaporwave Clean",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18" opacity="0.5"/></svg>',
    description: "Vaporwave suave sem reverb pesado. Tempo 0.80",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  RADIO_RETRO_AM: {
    id: "RADIO_RETRO_AM",
    name: "Radio Retro AM",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="8" width="20" height="14" rx="2"/><circle cx="8" cy="15" r="2"/><path d="M14 12h4M14 15h4M14 18h4M2 12h20" stroke-linecap="round"/></svg>',
    description: "Som de rádio AM antigo. Bandpass 300–3500Hz",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  CRYSTAL_SPEED: {
    id: "CRYSTAL_SPEED",
    name: "Crystal Speed",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke-linejoin="round"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke-linecap="round"/></svg>',
    description: "Speed Up cristalino. Tempo 1.35× sem distorção",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  TAPE_WARP: {
    id: "TAPE_WARP",
    name: "Tape / Vinyl Warp",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2a15 3 0 0 1 0 20 15 3 0 0 1 0-20" opacity="0.3"/></svg>',
    description: "Simulação de fita antiga. Wow/flutter e saturação",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  WHISPER_CORE: {
    id: "WHISPER_CORE",
    name: "Whisper Core",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 10h.01M15 10h.01" stroke-linecap="round"/><path d="M9.5 15.5c1 1 2.5 1.5 5 0" opacity="0.5"/><circle cx="12" cy="12" r="10" opacity="0.2"/></svg>',
    description: "Sussurro etéreo. Gate agressivo + reverb infinito",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  GHOST_REVERB: {
    id: "GHOST_REVERB",
    name: "Ghost Reverb",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C8 2 4 6 4 10v12l3-3 2 3 2-3 2 3 2-3 3 3V10c0-4-4-8-8-8z"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/></svg>',
    description: "Reverb fantasma. Predelay + decay muito longo",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  CHOIRIFY: {
    id: "CHOIRIFY",
    name: "Choirify",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke-linecap="round"/></svg>',
    description: "Coro sintético. Chorus + micro desafinação",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
    enabled: true,
  },
  SUBHARMONIC_BASS: {
    id: "SUBHARMONIC_BASS",
    name: "Subharmonic Bass",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13" stroke-linecap="round"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M3 12h18" stroke-width="4" opacity="0.3"/></svg>',
    description: "Grave enorme. Geração de sub-harmônicos",
    planLabel: "Plus Master",
    minPlan: "voz_plus_master",
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
