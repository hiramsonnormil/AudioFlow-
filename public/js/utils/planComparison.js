/**
 * Utilidades para comparação e gerenciamento de planos no frontend
 */

// Hierarquia de planos (menor para maior)
const PLAN_HIERARCHY = {
  free: 0,
  voz_pro: 1,
  voz_master: 2,
  voz_plus_master: 3,
};

// Nomes amigáveis dos planos
const PLAN_NAMES = {
  free: 'Gratuito',
  voz_pro: 'Voz Pro',
  voz_master: 'Voz Master',
  voz_plus_master: 'Voz Plus Master',
};

/**
 * Compara dois planos
 * @param {string} plan1 
 * @param {string} plan2 
 * @returns {number} -1 se plan1 < plan2, 0 se iguais, 1 se plan1 > plan2
 */
export function comparePlans(plan1, plan2) {
  const level1 = PLAN_HIERARCHY[plan1] ?? -1;
  const level2 = PLAN_HIERARCHY[plan2] ?? -1;
  
  if (level1 < level2) return -1;
  if (level1 > level2) return 1;
  return 0;
}

/**
 * Verifica se plan1 é superior a plan2
 */
export function isPlanHigher(plan1, plan2) {
  return comparePlans(plan1, plan2) > 0;
}

/**
 * Verifica se plan1 é inferior a plan2
 */
export function isPlanLower(plan1, plan2) {
  return comparePlans(plan1, plan2) < 0;
}

/**
 * Verifica se os planos são iguais
 */
export function arePlansEqual(plan1, plan2) {
  return comparePlans(plan1, plan2) === 0;
}

/**
 * Verifica se é um upgrade válido
 */
export function isValidUpgrade(currentPlan, newPlan) {
  return isPlanHigher(newPlan, currentPlan);
}

/**
 * Obtém o nome amigável do plano
 */
export function getPlanName(plan) {
  return PLAN_NAMES[plan] || plan;
}

/**
 * Obtém o nível numérico do plano
 */
export function getPlanLevel(plan) {
  return PLAN_HIERARCHY[plan] ?? -1;
}
