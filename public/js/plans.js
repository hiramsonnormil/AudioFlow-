/**
 * PHONA Plans Page
 * Gerencia interações na página de planos e fluxo de pagamento Pix
 */

import { isAuthenticated, getUser } from "./auth/session.js";
import { openModal } from "./auth/modal-auth.js";

// Estado do modal de pagamento
let paymentModal = null;
let paymentModalOverlay = null;
let statusPollingInterval = null;
let statusPollingTargetPixId = null;
let statusPollingStartedAt = null;

/**
 * Extrai o identificador Pix (transactionId) retornado pelo backend
 */
function extractPixId(payload) {
  if (!payload) return null;
  return (
    payload.transactionId ||
    payload.transactionID ||
    payload.pixId ||
    payload.pixID ||
    payload.payment?.transactionId ||
    payload.payment?.transactionID ||
    payload.payment?.pixId ||
    payload.payment?.id ||
    payload.pendingPayment?.pixId ||
    null
  );
}

/**
 * Criar modal de pagamento Pix
 */
function createPaymentModal() {
  if (paymentModal) return;

  // Overlay
  paymentModalOverlay = document.createElement('div');
  paymentModalOverlay.className = 'payment-modal-overlay';
  paymentModalOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9998;
    display: none;
    backdrop-filter: blur(12px);
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  // Modal
  paymentModal = document.createElement('div');
  paymentModal.className = 'payment-modal';
  paymentModal.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #1f1f1f;
    border: 1px solid rgba(194, 140, 102, 0.25);
    border-radius: 16px;
    padding: 2.5rem 2rem;
    max-width: 500px;
    width: 90vw;
    max-height: 90vh;
    overflow-y: auto;
    z-index: 9999;
    display: none;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
    animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;

  paymentModal.innerHTML = `
    <div id="paymentModalContent">
      <div style="text-align: center;">
        <div class="loading-spinner" style="
          width: 48px;
          height: 48px;
          margin: 2rem auto;
          border: 3px solid rgba(194, 140, 102, 0.2);
          border-top-color: #c28c66;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        "></div>
        <p style="color: #a8a29e; font-size: 1rem;">Gerando seu Pix...</p>
      </div>
    </div>
  `;

  // Animações
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
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .payment-modal::-webkit-scrollbar {
      width: 8px;
    }
    
    .payment-modal::-webkit-scrollbar-track {
      background: rgba(194, 140, 102, 0.1);
      border-radius: 4px;
    }
    
    .payment-modal::-webkit-scrollbar-thumb {
      background: rgba(194, 140, 102, 0.3);
      border-radius: 4px;
    }
    
    .payment-modal::-webkit-scrollbar-thumb:hover {
      background: rgba(194, 140, 102, 0.5);
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(paymentModalOverlay);
  document.body.appendChild(paymentModal);

  paymentModalOverlay.addEventListener('click', closePaymentModal);
}

/**
 * Mostrar modal de pagamento
 */
function showPaymentModal() {
  createPaymentModal();
  
  if (paymentModalOverlay && paymentModal) {
    paymentModalOverlay.style.display = 'block';
    paymentModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Fechar modal de pagamento
 */
function closePaymentModal() {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
    statusPollingInterval = null;
  }
  statusPollingTargetPixId = null;
  statusPollingStartedAt = null;
  
  if (paymentModalOverlay && paymentModal) {
    paymentModalOverlay.style.display = 'none';
    paymentModal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/**
 * Atualizar conteúdo do modal com dados do Pix
 */
function updateModalWithPixData(data) {
  const content = document.getElementById('paymentModalContent');
  if (!content) return;

  // Preferir informações de exibição vindas do backend (quando disponíveis)
  const targetPlan = data.isUpgrade ? data.requestedPlan : (data.displayPlanType || data.planType);
  const planNameMap = { free: 'Free', voz_pro: 'Voz Pro', voz_master: 'Voz Master', voz_plus_master: 'Plus Master' };
  const planName = planNameMap[targetPlan] || targetPlan;
  
  // Se for upgrade, mostrar o valor proporcional
  let planPrice;
  if (data.isUpgrade) {
    planPrice = `R$ ${(data.upgradeAmount / 100).toFixed(2).replace('.', ',')}`;
  } else if (typeof data.displayMonthlyAmount === 'number') {
    planPrice = `R$ ${(data.displayMonthlyAmount / 100).toFixed(2).replace('.', ',')}`;
  } else if (typeof data.monthlyAmount === 'number') {
    planPrice = `R$ ${(data.monthlyAmount / 100).toFixed(2).replace('.', ',')}`;
  } else {
    planPrice = '';
  }

  content.innerHTML = `
    <div style="text-align: center;">
      <!-- Header -->
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
      ">
        💳
      </div>
      
      <h2 style="
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 0.5rem;
        color: #f5f1ed;
      ">Pague com Pix</h2>
      
      <p style="
        color: #a8a29e;
        margin: 0 0 0.5rem;
        font-size: 1rem;
      ">${planName}${data.isUpgrade ? ' (Upgrade)' : ''} - ${planPrice}${data.isUpgrade ? ` (${data.daysRemaining} dias)` : '/mês'}</p>
      
      ${data.isUpgrade ? `
        <div style="
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin: 1rem 0;
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          text-align: left;
        ">
          <div style="font-size: 1.75rem;">📈</div>
          <div style="flex: 1;">
            <div style="
              color: #22c55e;
              font-weight: 700;
              font-size: 1rem;
              margin-bottom: 0.5rem;
            ">Upgrade Imediato</div>
            <div style="
              color: #a8a29e;
              font-size: 0.85rem;
              line-height: 1.5;
            ">
              • Você está fazendo upgrade para <strong>${planName}</strong><br/>
              • Valor proporcional aos <strong>${data.daysRemaining} dias</strong> restantes<br/>
              • Upgrade será ativado <strong>imediatamente</strong> após o pagamento<br/>
              • Sua próxima cobrança será no valor normal do plano
            </div>
          </div>
        </div>
      ` : ''}
      
      ${data.reused ? `
        <div style="
          background: rgba(194, 140, 102, 0.1);
          border: 1px solid rgba(194, 140, 102, 0.3);
          border-radius: 12px;
          padding: 0.875rem;
          margin: 1rem 0;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-align: left;
        ">
          <div style="font-size: 1.5rem;">♻️</div>
          <div style="flex: 1;">
            <div style="
              color: #c28c66;
              font-weight: 600;
              font-size: 0.9rem;
              margin-bottom: 0.25rem;
            ">Código PIX reutilizado</div>
            <div style="
              color: #a8a29e;
              font-size: 0.8rem;
              line-height: 1.4;
            ">Você já tinha um código pendente para este plano. Use o código abaixo para pagar.</div>
          </div>
        </div>
      ` : ''}
      
      <div style="
        background: rgba(194, 140, 102, 0.1);
        border: 1px solid rgba(194, 140, 102, 0.2);
        border-radius: 12px;
        padding: 1rem;
        margin: 1.5rem 0;
      ">
        <div style="
          font-size: 0.875rem;
          color: #6b6763;
          margin-bottom: 0.5rem;
        ">Status do pagamento</div>
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        ">
          <div class="status-dot" style="
            width: 10px;
            height: 10px;
            background: #ffc13a;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          "></div>
          <span style="
            color: #f5f1ed;
            font-weight: 600;
          ">Aguardando pagamento</span>
        </div>
      </div>

      <!-- QR Code -->
      ${data.pixQrCodeBase64 ? `
        <div style="
          background: white;
          padding: 1rem;
          border-radius: 12px;
          margin: 1.5rem 0;
          display: inline-block;
        ">
          <img 
            src="${data.pixQrCodeBase64.startsWith('data:') ? data.pixQrCodeBase64 : `data:image/png;base64,${data.pixQrCodeBase64}`}" 
            alt="QR Code Pix" 
            style="
              display: block;
              width: 250px;
              height: 250px;
              object-fit: contain;
            "
          />
        </div>
      ` : `
        <div style="
          background: rgba(194, 140, 102, 0.1);
          border: 1px solid rgba(194, 140, 102, 0.2);
          border-radius: 12px;
          padding: 2rem;
          margin: 1.5rem 0;
          text-align: center;
        ">
          <p style="color: #a8a29e; margin: 0;">QR Code não disponível</p>
        </div>
      `}

      <!-- Pix Copy and Paste -->
      <div style="margin: 1.5rem 0;">
        <label style="
          display: block;
          font-size: 0.875rem;
          color: #a8a29e;
          margin-bottom: 0.5rem;
          text-align: left;
        ">Código Pix Copia e Cola</label>
        <div style="
          display: flex;
          gap: 0.5rem;
        ">
          <input 
            type="text" 
            id="pixCodeInput"
            value="${data.pixCopyAndPaste || ''}" 
            readonly
            style="
              flex: 1;
              padding: 0.75rem;
              background: #252525;
              border: 1px solid rgba(194, 140, 102, 0.2);
              border-radius: 8px;
              color: #f5f1ed;
              font-family: monospace;
              font-size: 0.875rem;
              overflow: hidden;
              text-overflow: ellipsis;
            "
          />
          <button 
            id="copyPixBtn"
            style="
              padding: 0.75rem 1.25rem;
              background: linear-gradient(135deg, #c28c66, #a67351);
              color: white;
              border: none;
              border-radius: 8px;
              font-weight: 600;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.2s;
            "
          >Copiar</button>
        </div>
      </div>

      <!-- Aviso de Expiração -->
      <div style="
        text-align: center;
        background: rgba(255, 193, 58, 0.1);
        border: 1px solid rgba(255, 193, 58, 0.3);
        border-radius: 12px;
        padding: 1rem;
        margin: 1.5rem 0;
      ">
        <p style="
          font-size: 0.875rem;
          color: #ffc13a;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        ">
          <span style="font-size: 1.25rem;">⏰</span>
          Este Pix expira em <strong>15 minutos</strong>
        </p>
      </div>

      <!-- Instruções -->
      <div style="
        text-align: left;
        background: rgba(194, 140, 102, 0.08);
        border-radius: 12px;
        padding: 1.25rem;
        margin: 1.5rem 0;
      ">
        <p style="
          font-size: 0.875rem;
          color: #f5f1ed;
          font-weight: 600;
          margin: 0 0 0.75rem;
        ">Como pagar:</p>
        <ol style="
          font-size: 0.875rem;
          color: #a8a29e;
          line-height: 1.6;
          margin: 0;
          padding-left: 1.25rem;
        ">
          <li>Abra o app do seu banco</li>
          <li>Escolha pagar com Pix QR Code ou Pix Copia e Cola</li>
          <li>Escaneie o QR Code ou cole o código acima</li>
          <li>Confirme o pagamento de ${planPrice}</li>
        </ol>
      </div>

      <!-- Botão fechar -->
      <button 
        id="closePaymentBtn"
        style="
          width: 100%;
          padding: 1rem;
          background: transparent;
          color: #a8a29e;
          border: 1px solid rgba(194, 140, 102, 0.25);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        "
      >Fechar</button>
    </div>
  `;

  // Adicionar animação de pulse
  const pulseStyle = document.createElement('style');
  pulseStyle.textContent = `
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(0.95); }
    }
  `;
  document.head.appendChild(pulseStyle);

  // Event listener para copiar código Pix
  const copyBtn = document.getElementById('copyPixBtn');
  const pixCodeInput = document.getElementById('pixCodeInput');
  
  copyBtn?.addEventListener('click', async () => {
    try {
      const textToCopy = pixCodeInput?.value || data.pixCopyAndPaste;
      await navigator.clipboard.writeText(textToCopy);
      
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copiado!';
      copyBtn.style.background = 'linear-gradient(135deg, #20c978, #17a85f)';
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = 'linear-gradient(135deg, #c28c66, #a67351)';
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
      copyBtn.textContent = '✗ Erro';
      setTimeout(() => {
        copyBtn.textContent = 'Copiar';
      }, 2000);
    }
  });

  // Event listener para fechar
  const closeBtn = document.getElementById('closePaymentBtn');
  closeBtn?.addEventListener('click', closePaymentModal);

  // Iniciar polling do status acompanhando o Pix gerado
  const pixId = extractPixId(data);
  startStatusPolling(data.userId, data.subscriptionId, pixId);
}

/**
 * Polling para verificar status do pagamento
 */
function startStatusPolling(userId, subscriptionId, targetPixId) {
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }

  statusPollingTargetPixId = targetPixId || null;
  statusPollingStartedAt = Date.now();

  statusPollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`/api/subscriptions/${userId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('phona:token')}`
        }
      });

      if (!response.ok) return;

      const data = await response.json();

      const lastPayment = data.lastPayment || null;
      const lastPaymentStatus = lastPayment?.status ? String(lastPayment.status).toLowerCase() : null;
      const lastPaymentPixId = lastPayment?.pixId || null;
      const paidAtMs = lastPayment?.paidAt ? new Date(lastPayment.paidAt).getTime() : null;
      const paidAtValid = Number.isFinite(paidAtMs);
      const startedAt = statusPollingStartedAt || 0;
      const paidAfterStart = paidAtValid ? paidAtMs >= startedAt - 1000 : false;
      const matchesTargetPix = statusPollingTargetPixId && lastPaymentPixId
        ? statusPollingTargetPixId === lastPaymentPixId
        : false;

      const paymentConfirmed = Boolean(data.active) && lastPaymentStatus === 'paid' && (
        (matchesTargetPix && (paidAfterStart || !paidAtValid)) ||
        (!statusPollingTargetPixId && paidAfterStart)
      );

      if (paymentConfirmed) {
        const user = getUser();
        if (user && data.planType) {
          user.plan = data.planType;
          localStorage.setItem('phona:user', JSON.stringify(user));
          console.log('✅ Plano atualizado no localStorage:', data.planType);
        }

        showSuccessMessage();
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;
        statusPollingTargetPixId = null;
        statusPollingStartedAt = null;
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  }, 3000); // Check a cada 3 segundos
}

/**
 * Mostrar mensagem de sucesso
 */
function showSuccessMessage() {
  const content = document.getElementById('paymentModalContent');
  if (!content) return;

  content.innerHTML = `
    <div style="text-align: center;">
      <div style="
        width: 72px;
        height: 72px;
        margin: 0 auto 1.5rem;
        background: linear-gradient(135deg, #20c978, #17a85f);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2.5rem;
      ">
        ✓
      </div>
      
      <h2 style="
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 1rem;
        color: #f5f1ed;
      ">Pagamento Confirmado!</h2>
      
      <p style="
        color: #a8a29e;
        margin: 0 0 2rem;
        line-height: 1.6;
      ">
        Sua assinatura foi ativada com sucesso.<br>
        Aproveite todos os recursos do seu plano!
      </p>

      <button 
        onclick="window.location.href='/'"
        style="
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #c28c66, #a67351);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        "
      >Começar a usar</button>
    </div>
  `;
}

/**
 * Mostrar mensagem de erro
 */
function showErrorMessage(message) {
  const content = document.getElementById('paymentModalContent');
  if (!content) return;

  content.innerHTML = `
    <div style="text-align: center;">
      <div style="
        width: 72px;
        height: 72px;
        margin: 0 auto 1.5rem;
        background: linear-gradient(135deg, #ff4d4d, #cc0000);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
      ">
        ⚠️
      </div>
      
      <h2 style="
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 1rem;
        color: #f5f1ed;
      ">Erro ao processar</h2>
      
      <p style="
        color: #a8a29e;
        margin: 0 0 2rem;
        line-height: 1.6;
      ">${message || 'Não foi possível gerar o pagamento. Tente novamente.'}</p>

      <button 
        id="closeErrorBtn"
        style="
          width: 100%;
          padding: 1rem;
          background: transparent;
          color: #a8a29e;
          border: 1px solid rgba(194, 140, 102, 0.25);
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
        "
      >Fechar</button>
    </div>
  `;

  const closeBtn = document.getElementById('closeErrorBtn');
  closeBtn?.addEventListener('click', closePaymentModal);
}

/**
 * Iniciar fluxo de assinatura
 */
async function startSubscriptionFlow(planType) {
  showPaymentModal();

  try {
    const user = getUser();
    if (!user || !user._id) {
      throw new Error('Usuário não encontrado');
    }

    const response = await fetch('/api/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('phona:token')}`
      },
      body: JSON.stringify({
        userId: user._id,
        email: user.email,
        planType
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Tratar erros específicos
      if (data.error === 'downgrade_not_allowed') {
        showErrorMessage(`
          ⚠️ Downgrade não permitido<br><br>
          Você está no plano <strong>${data.currentPlan === 'voz_pro' ? 'Voz Pro' : 'Voz Master'}</strong> e tentou mudar para <strong>${data.requestedPlan === 'voz_pro' ? 'Voz Pro' : 'Voz Master'}</strong>.<br><br>
          Para fazer downgrade, entre em contato com o suporte.
        `);
        return;
      }

      if (data.error === 'plan_already_active') {
        showErrorMessage(`
          Você já possui o plano <strong>${data.currentPlan === 'voz_pro' ? 'Voz Pro' : 'Voz Master'}</strong> ativo!<br><br>
          Válido até: <strong>${new Date(data.nextBillingDate).toLocaleDateString('pt-BR')}</strong>
        `);
        return;
      }
      
      throw new Error(data.message || data.error || 'Erro ao criar assinatura');
    }

    // Mensagem apropriada dependendo do tipo de operação
    if (data.isUpgrade) {
      console.log('📈 Upgrade solicitado:', {
        from: data.planType,
        to: data.requestedPlan,
        amount: data.upgradeAmount,
        daysRemaining: data.daysRemaining
      });
    } else if (data.pending || data.reused) {
      console.log('♻️ Reutilizando PIX pendente existente');
    } else {
      console.log('🆕 Novo código PIX gerado');
    }

    console.log('Dados recebidos do backend:', {
      planType: data.planType || data.requestedPlan,
      isUpgrade: data.isUpgrade,
      pending: data.pending,
      reused: data.reused,
      hasQrCode: !!data.pixQrCodeBase64,
      hasCopyPaste: !!data.pixCopyAndPaste
    });
    updateModalWithPixData(data);

  } catch (error) {
    console.error('Erro ao iniciar assinatura:', error);
    showErrorMessage(error.message);
  }
}

/**
 * Handler para clique nos botões de plano
 */
function handlePlanClick(event) {
  event.preventDefault();
  const button = event.currentTarget;
  const plan = button.dataset.planTarget;

  if (!plan) {
    return;
  }

  const authenticated = isAuthenticated();

  // Se não autenticado, redirecionar para login/signup
  if (!authenticated) {
    const loginUrl = plan === "free" 
      ? "/#processor" 
      : `/?signup=true&plan=${plan}`;
    window.location.href = loginUrl;
    return;
  }

  // Plano free apenas redireciona
  if (plan === "free") {
    window.location.href = "/#processor";
    return;
  }

  // Iniciar fluxo de assinatura para planos pagos
  startSubscriptionFlow(plan);
}

/**
 * Buscar plano atualizado do servidor
 */
async function fetchCurrentPlan() {
  const user = getUser();
  if (!user?._id) return null;

  try {
    const token = localStorage.getItem('phona:token');
    const response = await fetch(`/api/subscriptions/${user._id}/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();

      // Preferir effectivePlanType do backend; fallback mantém regra de ativo
      const effectivePlan = data.effectivePlanType 
        ? data.effectivePlanType 
        : (data.active ? (data.planType || user.plan || 'free') : (user.plan || 'free'));

      // Atualizar localStorage apenas quando ativo
      if (data.active && data.planType && user.plan !== data.planType) {
        user.plan = data.planType;
        localStorage.setItem('phona:user', JSON.stringify(user));
        console.log(`✅ Plano atualizado (ativo): ${data.planType}`);
      }

      return {
        plan: effectivePlan,
        status: data.status,
        active: data.active,
        nextBillingDate: data.nextBillingDate
      };
    }
  } catch (error) {
    console.error('Erro ao buscar plano atual:', error);
  }

  return { plan: user.plan || 'free' };
}

/**
 * Mostrar plano atual do usuário
 */
async function showCurrentPlan() {
  const user = getUser();
  if (!user) return;

  // Buscar plano atualizado do servidor
  const planInfo = await fetchCurrentPlan();
  const currentPlan = planInfo.plan;
  
  // Encontrar o card do plano atual
  const currentCard = document.querySelector(`[data-plan="${currentPlan}"]`);
  if (!currentCard) return;

  // Adicionar badge "Plano Atual"
  const badge = document.createElement('span');
  badge.className = 'current-plan-badge';
  badge.textContent = planInfo.active ? 'PLANO ATIVO' : 'PLANO ATUAL';
  badge.style.cssText = `
    position: absolute;
    top: 1.5rem;
    left: 1.5rem;
    background: linear-gradient(135deg, ${planInfo.active ? '#20c978, #17a85f' : '#c28c66, #a67351'});
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 0.375rem 0.75rem;
    border-radius: 100px;
    z-index: 10;
  `;
  currentCard.style.position = 'relative';
  currentCard.appendChild(badge);

  // Mudar texto do botão
  const button = currentCard.querySelector('.plan-card__cta');
  if (button && currentPlan !== 'free') {
    // Sempre desabilitar o botão do plano atual (ativo ou não)
    button.textContent = planInfo.active ? 'Plano Ativo' : 'Plano Atual';
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
  }

  // Mostrar data de renovação se disponível
  if (planInfo.active && planInfo.nextBillingDate) {
    const renewalDate = new Date(planInfo.nextBillingDate);
    const renewalInfo = document.createElement('div');
    renewalInfo.style.cssText = `
      text-align: center;
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(32, 201, 120, 0.1);
      border: 1px solid rgba(32, 201, 120, 0.2);
      border-radius: 8px;
      font-size: 0.875rem;
      color: #20c978;
    `;
    renewalInfo.textContent = `Renova em ${renewalDate.toLocaleDateString('pt-BR')}`;
    currentCard.appendChild(renewalInfo);
  }
}

/**
 * Inicializar botões de plano
 */
function initPlanButtons() {
  const buttons = document.querySelectorAll(".plan-card__cta");
  buttons.forEach((button) => {
    button.addEventListener("click", handlePlanClick);
  });
}

/**
 * Inicializar navbar com botões de auth
 */
function initNavbar() {
  const authenticated = isAuthenticated();
  const loginBtn = document.getElementById('openLoginBtn');
  const signupBtn = document.getElementById('openSignupBtn');
  const userMenu = document.getElementById('userMenu');

  // Adicionar event listeners para os botões
  loginBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('login');
  });

  signupBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal('signup');
  });

  if (authenticated) {
    // Mostrar menu do usuário
    if (loginBtn) loginBtn.style.display = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (userMenu) {
      userMenu.style.display = 'block';
      const user = getUser();
      const initial = user?.username?.charAt(0)?.toUpperCase() || '?';
      userMenu.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(194, 140, 102, 0.1);
          border: 1px solid rgba(194, 140, 102, 0.2);
          border-radius: 100px;
          cursor: pointer;
        " title="${user?.email || ''}">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #c28c66, #a67351);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 0.875rem;
          ">${initial}</div>
          <span style="color: #f5f1ed; font-weight: 500;">${user?.username || 'Usuário'}</span>
        </div>
      `;
    }
  } else {
    // Mostrar botões de login/signup
    if (loginBtn) loginBtn.style.display = 'block';
    if (signupBtn) signupBtn.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
  }
}

/**
 * Inicialização
 */
function init() {
  initNavbar();
  initPlanButtons();
  showCurrentPlan();
}

// Iniciar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

