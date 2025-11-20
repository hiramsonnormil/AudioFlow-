/**
 * PHONA Main Bootstrap
 * Inicialização geral do app
 */

import { initRouteGuard } from './router.js';

/**
 * Inicializar guards de rota
 */
function init() {
  initRouteGuard();
}

// Executar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export default { init };
