/**
 * Plan Upgrade Modal
 * Modal para avisar usuário que precisa fazer upgrade de plano
 * Identidade: Analógica moderna com paleta copper
 */

let planModal = null;
let planModalOverlay = null;

function createPlanModal() {
  if (planModal) return;

  // Overlay
  planModalOverlay = document.createElement('div');
  planModalOverlay.className = 'plan-modal-overlay';
  planModalOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9998;
    display: none;
    backdrop-filter: blur(12px);
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  // Modal
  planModal = document.createElement('div');
  planModal.className = 'plan-modal';
  planModal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1f1f1f;
    border: 1px solid rgba(194, 140, 102, 0.25);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    max-width: 480px;
    width: 90vw;
    z-index: 9999;
    display: none;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(194, 140, 102, 0.1);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  planModal.innerHTML = `
    <div style="text-align: center;">
      <!-- Icon -->
      <div style="
        width: 72px;
        height: 72px;
        margin: 0 auto 1.5rem;
        background: linear-gradient(135deg, #c28c66, #a67351);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        box-shadow: 0 8px 24px rgba(194, 140, 102, 0.3);
      ">
        🔒
      </div>
      
      <!-- Title -->
      <h2 style="
        font-family: 'Space Grotesk', 'Inter', sans-serif;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 1rem;
        color: #f5f1ed;
        letter-spacing: -0.01em;
      ">Recurso Bloqueado</h2>
      
      <!-- Message -->
      <p style="
        color: #a8a29e;
        margin: 0 0 2rem;
        line-height: 1.6;
        font-size: 1rem;
      " id="planModalMessage">
        Este efeito não está incluído no seu plano atual.
      </p>
      
      <!-- Buttons -->
      <div style="display: flex; gap: 1rem; flex-direction: column;">
        <button id="planModalUpgradeBtn" style="
          width: 100%;
          padding: 1rem 2rem;
          background: linear-gradient(135deg, #c28c66, #a67351);
          color: #ffffff;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(194, 140, 102, 0.3);
        " 
        onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 24px rgba(194, 140, 102, 0.4)'"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 16px rgba(194, 140, 102, 0.3)'"
        >Ver Planos</button>
        
        <button id="planModalCloseBtn" style="
          width: 100%;
          padding: 1rem 2rem;
          background: transparent;
          color: #a8a29e;
          border: 1px solid rgba(194, 140, 102, 0.25);
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        "
        onmouseover="this.style.background='rgba(194, 140, 102, 0.08)'; this.style.borderColor='rgba(194, 140, 102, 0.4)'; this.style.color='#f5f1ed'"
        onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(194, 140, 102, 0.25)'; this.style.color='#a8a29e'"
        >Fechar</button>
      </div>
    </div>
  `;

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, -40%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(planModalOverlay);
  document.body.appendChild(planModal);

  // Event listeners
  const upgradeBtn = document.getElementById('planModalUpgradeBtn');
  const closeBtn = document.getElementById('planModalCloseBtn');

  upgradeBtn?.addEventListener('click', () => {
    window.location.href = '/plans';
  });

  closeBtn?.addEventListener('click', closePlanModal);
  planModalOverlay?.addEventListener('click', closePlanModal);
}

/**
 * Show plan modal with custom message
 * @param {string} message - Message to display
 */
export function showPlanModal(message = 'Este recurso não está incluído no seu plano atual.') {
  createPlanModal();
  
  const messageEl = document.getElementById('planModalMessage');
  if (messageEl) {
    messageEl.textContent = message;
  }

  if (planModalOverlay && planModal) {
    planModalOverlay.style.display = 'block';
    planModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Close plan modal
 */
export function closePlanModal() {
  if (planModalOverlay && planModal) {
    planModalOverlay.style.display = 'none';
    planModal.style.display = 'none';
    document.body.style.overflow = '';
  }
}
