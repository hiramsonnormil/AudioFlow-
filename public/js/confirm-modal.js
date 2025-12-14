/**
 * PHONA Confirmation Modal
 * Modal de confirmação reutilizável e bonito
 */

/**
 * Mostrar modal de confirmação
 * @param {Object} options - Opções do modal
 * @param {string} options.title - Título do modal
 * @param {string} options.message - Mensagem do modal
 * @param {string} options.icon - Emoji ou ícone (default: '🚪')
 * @param {string} options.confirmText - Texto do botão de confirmação (default: 'Confirmar')
 * @param {string} options.cancelText - Texto do botão de cancelar (default: 'Cancelar')
 * @returns {Promise<boolean>} - true se confirmado, false se cancelado
 */
export function showConfirmModal({
    title = 'Confirmar ação',
    message = 'Tem certeza que deseja continuar?',
    icon = '🚪',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar'
} = {}) {
    return new Promise((resolve) => {
        // Criar elementos do modal
        const modal = document.createElement('div');
        modal.className = 'confirm-modal';
        modal.innerHTML = `
      <div class="confirm-modal-overlay"></div>
      <div class="confirm-modal-content">
        <div class="confirm-modal-icon">${icon}</div>
        <h3 class="confirm-modal-title">${title}</h3>
        <p class="confirm-modal-message">${message}</p>
        <div class="confirm-modal-actions">
          <button class="confirm-modal-btn confirm-modal-btn-cancel" data-action="cancel">
            ${cancelText}
          </button>
          <button class="confirm-modal-btn confirm-modal-btn-confirm" data-action="confirm">
            ${confirmText}
          </button>
        </div>
      </div>
    `;

        // Adicionar ao body
        document.body.appendChild(modal);

        // Função para fechar modal
        const closeModal = (confirmed) => {
            modal.classList.add('closing');
            setTimeout(() => {
                modal.remove();
                resolve(confirmed);
            }, 200);
        };

        // Mostrar modal com pequeno delay para animação
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        // Event listeners
        const cancelBtn = modal.querySelector('[data-action="cancel"]');
        const confirmBtn = modal.querySelector('[data-action="confirm"]');
        const overlay = modal.querySelector('.confirm-modal-overlay');

        cancelBtn.addEventListener('click', () => closeModal(false));
        confirmBtn.addEventListener('click', () => closeModal(true));
        overlay.addEventListener('click', () => closeModal(false));

        // ESC para cancelar
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal(false);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Enter para confirmar
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                closeModal(true);
                document.removeEventListener('keydown', handleEnter);
            }
        };
        document.addEventListener('keydown', handleEnter);
    });
}

/**
 * Atalho específico para confirmação de logout
 * @returns {Promise<boolean>}
 */
export async function confirmLogout() {
    return showConfirmModal({
        title: 'Sair da conta',
        message: 'Tem certeza que deseja sair? Você precisará fazer login novamente para acessar seus processamentos.',
        icon: '👋',
        confirmText: 'Sim, sair',
        cancelText: 'Cancelar'
    });
}
