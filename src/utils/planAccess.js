import { PRESETS } from "../models/Preset.js";
import { User } from "../models/User.js";

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_CONFIG = {
  free: {
    label: "Plano Free",
    presets: ["SLOWED", "SLOWED_REVERB"],
    limit: { count: 3, windowMs: TWO_DAYS_MS },
  },
  voz_pro: {
    label: "Voz Pro",
    presets: [
      "SLOWED",
      "SLOWED_REVERB",
      "SPEED_125",
      "ULTRA_SLOWED",
      "MUFFLED_SLOWED",
      "MUFFLED_SPEED",
      "DAYCORE",
      "NIGHTCORE",
      "PHONA",
      "ECHO",
      "REVERB",
    ],
    limit: { count: 60, windowMs: ONE_DAY_MS },
  },
  voz_master: {
    label: "Voz Master",
    presets: null, // null => todos os presets habilitados exceto plus_master
    limit: { count: 60, windowMs: ONE_DAY_MS },
  },
  plano_plus_master: {
    label: "Plano Plus Master",
    presets: null, // null => TODOS os presets incluindo plus_master exclusivos
    limit: { count: 60, windowMs: ONE_DAY_MS },
  },
};

const PLAN_ALIAS = {
  pro: "voz_pro",
  premium_30: "voz_master",
  business: "voz_master",
  voz_plus_master: "plano_plus_master", // Alias para Plus Master
};

function getPlanKey(plan) {
  if (!plan) return "free";
  if (PLAN_CONFIG[plan]) {
    return plan;
  }
  const alias = PLAN_ALIAS[plan];
  if (alias && PLAN_CONFIG[alias]) {
    return alias;
  }
  return "free";
}

export function getPlanInfo(plan) {
  return PLAN_CONFIG[getPlanKey(plan)];
}

export function isPresetAllowedForPlan(plan, presetId) {
  const normalizedPreset = typeof presetId === "string" ? presetId.trim().toUpperCase() : "";
  if (!normalizedPreset || !PRESETS[normalizedPreset]) {
    return false;
  }

  // Presets exclusivos do Plus Master
  const plusMasterOnlyPresets = [
    'BABY_VOICE', 'DEEP_VOICE', 'VAPORWAVE_CLEAN', 
    'RADIO_RETRO_AM', 'CRYSTAL_SPEED', 'TAPE_WARP',
    'WHISPER_CORE', 'GHOST_REVERB', 'CHOIRIFY', 'SUBHARMONIC_BASS'
  ];

  // Se o preset é exclusivo do Plus Master, apenas esse plano pode usar
  if (plusMasterOnlyPresets.includes(normalizedPreset)) {
    return plan === 'plano_plus_master' || plan === 'voz_plus_master';
  }

  const planInfo = getPlanInfo(plan);
  if (!planInfo.presets) {
    return true; // todos os presets liberados (exceto plus_master exclusivos já tratados acima)
  }
  return planInfo.presets.includes(normalizedPreset);
}

export async function prepareUsageReservation(plan, userId) {
  const planInfo = getPlanInfo(plan);
  const now = Date.now();
  const windowStart = now - planInfo.limit.windowMs;

  // Buscar usuário do banco de dados
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // Filtrar histórico recente (dentro da janela de tempo)
  const recent = (user.usageHistory || [])
    .map(entry => new Date(entry.timestamp).getTime())
    .filter(timestamp => timestamp > windowStart);

  const allowed = recent.length < planInfo.limit.count;
  const retryAt = allowed
    ? null
    : new Date(Math.min(...recent) + planInfo.limit.windowMs);

  return {
    allowed,
    retryAt,
    remaining: Math.max(planInfo.limit.count - recent.length, 0),
    async commit() {
      // Limpar histórico antigo e adicionar novo timestamp
      const updatedHistory = (user.usageHistory || [])
        .filter(entry => new Date(entry.timestamp).getTime() > windowStart);
      
      updatedHistory.push({ timestamp: new Date(now) });

      await User.findByIdAndUpdate(userId, {
        $set: { usageHistory: updatedHistory }
      });
    },
  };
}

export function getPlanDisplayName(plan) {
  return getPlanInfo(plan).label;
}
