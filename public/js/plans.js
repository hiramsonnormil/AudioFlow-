/**
 * PHONA Plans Page
 * Gerencia interações na página de planos e fluxo de pagamento Pix
 */

import { isAuthenticated, getUser } from "./auth/session.js";
import { openModal } from "./auth/modal-auth.js";
import { isValidUpgrade, arePlansEqual, isPlanLower, getPlanName } from "./utils/planComparison.js";

// Estado do modal de pagamento
let paymentModal = null;
let paymentModalOverlay = null;
let statusPollingInterval = null;

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
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translate(-50%, -20px);
      }
      to {
        opacity: 1;
        transform: translate(-50%, 0);
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
  
  if (paymentModalOverlay && paymentModal) {
    paymentModalOverlay.style.display = 'none';
    paymentModal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

/**
 * Mostrar erro de validação de plano
 */
function showPlanValidationError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #ff4d4d, #cc0000);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 77, 77, 0.4);
    z-index: 10000;
    max-width: 500px;
    width: 90%;
    font-weight: 600;
    animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  `;
  errorDiv.textContent = message;
  
  document.body.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.style.animation = 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    setTimeout(() => errorDiv.remove(), 300);
  }, 5000);
}

/**
 * Atualizar conteúdo do modal com dados do Pix
 */
function updateModalWithPixData(data) {
  const content = document.getElementById('paymentModalContent');
  if (!content) return;

  // Mapear nome e preço do plano
  const planName = data.planType === 'voz_pro' ? 'Voz Pro' : 
                   data.planType === 'voz_plus_master' ? 'Voz Master' :
                   data.planType === 'plano_plus_master' ? 'Plano Plus Master' :
                   'Voz Master';
  
  // Calcular preço formatado a partir do valor em centavos
  const planPrice = `R$ ${(data.value / 100).toFixed(2).replace('.', ',')}`;

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
      ">${planName} - ${planPrice}/mês</p>
      
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

  // Adicionar botão "Já paguei" para consulta manual
  const alreadyPaidBtn = document.createElement('button');
  alreadyPaidBtn.id = 'alreadyPaidBtn';
  alreadyPaidBtn.textContent = 'Já paguei - Verificar agora';
  alreadyPaidBtn.style.cssText = `
    width: 100%;
    padding: 1rem;
    margin-top: 0.5rem;
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  `;
  
  // Adicionar informação sobre verificação automática
  const autoCheckInfo = document.createElement('p');
  autoCheckInfo.style.cssText = `
    margin-top: 1rem;
    text-align: center;
    font-size: 0.875rem;
    color: #78716c;
  `;
  autoCheckInfo.innerHTML = '🔄 <strong>Verificação automática ativa</strong><br>Não precisa clicar em nada, o pagamento será confirmado automaticamente';
  
  alreadyPaidBtn.addEventListener('click', async () => {
    alreadyPaidBtn.disabled = true;
    alreadyPaidBtn.textContent = 'Verificando...';
    
    try {
      const response = await fetch(`/api/pix/check/${data.transactionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('phona:token')}`
        }
      });

      const result = await response.json();

      if (result.success && result.data?.status === 'paid') {
        console.log('✅ Pagamento confirmado via botão manual!');
        
        const user = getUser();
        if (user && result.data.payment?.subscriptionId?.plan) {
          const planMap = {
            'voz_plus_master': 'voz_plus_master',
            'voz_pro': 'voz_pro',
            'voz_master': 'voz_master'
          };
          const newPlan = planMap[result.data.payment.subscriptionId.plan] || 'free';
          user.plan = newPlan;
          localStorage.setItem('phona:user', JSON.stringify(user));
          console.log('✅ Plano atualizado:', newPlan);
        }
        
        // Parar polling se estiver ativo
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
        }
        
        showSuccessMessage();
      } else {
        alreadyPaidBtn.textContent = 'Pagamento ainda não confirmado';
        setTimeout(() => {
          alreadyPaidBtn.textContent = 'Já paguei - Verificar agora';
          alreadyPaidBtn.disabled = false;
        }, 3000);
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      alreadyPaidBtn.textContent = 'Erro - Tente novamente';
      setTimeout(() => {
        alreadyPaidBtn.textContent = 'Já paguei - Verificar agora';
        alreadyPaidBtn.disabled = false;
      }, 3000);
    }
  });

  closeBtn?.parentElement?.insertBefore(alreadyPaidBtn, closeBtn);
  closeBtn?.parentElement?.insertBefore(autoCheckInfo, closeBtn);

  // Iniciar polling automático do status (verifica a cada 3 segundos)
  startStatusPolling(data.transactionId);
}

/**
 * Polling para verificar status do pagamento
 * Verifica periodicamente se o pagamento foi confirmado
 */
function startStatusPolling(transactionId) {
  // Limpar polling existente se houver
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }

  let pollCount = 0;
  const maxPolls = 600; // 30 minutos (600 * 3 segundos)

  console.log('🔄 Polling iniciado - verificando pagamento a cada 3 segundos');

  statusPollingInterval = setInterval(async () => {
    pollCount++;

    // Parar após 30 minutos
    if (pollCount >= maxPolls) {
      clearInterval(statusPollingInterval);
      statusPollingInterval = null;
      console.warn('⏰ Polling timeout - 30 minutos excedidos');
      return;
    }

    try {
      // Chamar endpoint específico para verificar este pagamento
      const response = await fetch(`/api/pix/check/${transactionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('phona:token')}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      // Se recebeu erro 429, apenas aguardar próximo intervalo
      if (!response.ok && response.status === 429) {
        if (pollCount % 10 === 0) {
          console.log('[Polling] Rate limit atingido, aguardando...');
        }
        return;
      }
      
      if (!response.ok) {
        console.warn('[Polling] Erro na resposta:', response.status, result);
        return;
      }
      
      console.log('[Polling] Resposta recebida:', result);

      // Se pagamento foi confirmado
      if (result.success && result.data?.status === 'paid') {
        console.log('🎉 PAGAMENTO CONFIRMADO AUTOMATICAMENTE!', result.data);

        // Parar o polling
        clearInterval(statusPollingInterval);
        statusPollingInterval = null;

        // Atualizar plano no localStorage
        const user = getUser();
        if (user && result.data.payment?.subscriptionId?.plan) {
          const planMap = {
            'voz_plus_master': 'voz_plus_master',
            'voz_pro': 'voz_pro',
            'voz_master': 'voz_master'
          };
          const newPlan = planMap[result.data.payment.subscriptionId.plan] || 'free';
          user.plan = newPlan;
          localStorage.setItem('phona:user', JSON.stringify(user));
          console.log('✅ Plano atualizado automaticamente:', newPlan);
        }
        
        // Mostrar mensagem de sucesso
        showSuccessMessage();
      } else {
        // Log para debug
        if (pollCount % 5 === 0) {
          console.log(`[Polling ${pollCount}/${maxPolls}] Status: ${result.data?.status || 'pending'}`);
        }
      }
    } catch (error) {
      // Erro silencioso, apenas log a cada 20 tentativas
      if (pollCount % 20 === 0) {
        console.warn('[Polling] Erro ao verificar:', error.message);
      }
    }
  }, 3000); // Verificar a cada 3 segundos
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
        color: #20c978;
      ">🎉 Pagamento Confirmado!</h2>
      
      <p style="
        color: #a8a29e;
        margin: 0 0 0.5rem;
        line-height: 1.6;
      ">
        Sua assinatura foi ativada com sucesso!<br>
        Aproveite todos os recursos do seu plano.
      </p>
      
      <p style="
        color: #78716c;
        font-size: 0.875rem;
        margin: 0 0 2rem;
      ">
        ✅ Detectado automaticamente pelo sistema
      </p>

      <button 
        id="successContinueBtn"
        style="
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #c28c66, #a67351);
          color: white;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        "
      >Começar a usar</button>
    </div>
  `;
  
  // Adicionar event listener ao botão
  const continueBtn = document.getElementById('successContinueBtn');
  if (continueBtn) {
    continueBtn.addEventListener('click', () => {
      window.location.href = '/html/index.html';
    });
  }
  
  // Auto-redirecionar após 5 segundos
  setTimeout(() => {
    console.log('🔄 Redirecionando para página principal...');
    window.location.reload();
  }, 5000);
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

    // Mapear nome do plano para o formato esperado pelo backend
    const planMap = {
      'voz_pro': 'voz_pro',
      'voz_master': 'voz_master',
      'voz_plus_master': 'voz_plus_master',
      'plano_plus_master': 'plano_plus_master'
    };

    const plan = planMap[planType] || planType;

    // Chamar novo endpoint PIX
    const response = await fetch('/api/pix/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('phona:token')}`
      },
      body: JSON.stringify({
        plan: plan
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMessage = result.error || 'Erro ao criar cobrança PIX';
      
      // Mostrar mensagem amigável para erros de validação de plano
      if (errorMessage.includes('já possui uma assinatura ativa') || 
          errorMessage.includes('não é possível fazer downgrade') ||
          errorMessage.includes('Não é possível fazer downgrade')) {
        showPlanValidationError(errorMessage);
        throw new Error(errorMessage);
      }
      
      throw new Error(errorMessage);
    }

    if (!result.success || !result.data) {
      throw new Error('Resposta inválida do servidor');
    }

    const data = result.data;

    console.log('🆕 Cobrança PIX criada:', {
      transactionId: data.transactionId,
      value: data.value,
      plan: plan
    });

    // Adaptar dados para o formato que o modal espera
    const modalData = {
      userId: user._id,
      subscriptionId: data.subscriptionId,
      transactionId: data.transactionId,
      planType: plan,
      value: data.value, // Valor em centavos
      pixQrCodeBase64: data.qrCodeBase64,
      pixCopyAndPaste: data.qrCode,
      isUpgrade: false,
      reused: false
    };

    updateModalWithPixData(modalData);

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
      ? "/html/index.html#processor" 
      : `/html/index.html?signup=true&plan=${plan}`;
    window.location.href = loginUrl;
    return;
  }

  // Plano free apenas redireciona
  if (plan === "free") {
    window.location.href = "/html/index.html#processor";
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
    
    // Buscar pagamentos do usuário para verificar assinatura ativa
    const response = await fetch('/api/pix/payments', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const result = await response.json();
      
      if (result.success && result.data) {
        // Procurar pagamento pago com assinatura ativa
        const activePayment = result.data.find(p => 
          p.status === 'paid' && 
          p.subscriptionId?.status === 'active' &&
          new Date(p.subscriptionId.expiresAt) > new Date()
        );

        if (activePayment) {
          const planMap = {
            'voz_plus_master': 'voz_master',
            'voz_pro': 'voz_pro',
            'voz_master': 'voz_master',
            'plano_plus_master': 'voz_master'
          };
          const plan = planMap[activePayment.subscriptionId.plan] || 'free';

          // Atualizar o plano no localStorage se mudou
          if (user.plan !== plan) {
            user.plan = plan;
            localStorage.setItem('phona:user', JSON.stringify(user));
            console.log(`✅ Plano atualizado: ${plan}`);
          }

          return {
            plan: plan,
            status: 'active',
            active: true,
            nextBillingDate: activePayment.subscriptionId.expiresAt
          };
        }
      }
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

  // Mudar texto do botão do plano atual
  const button = currentCard.querySelector('.plan-card__cta');
  if (button && currentPlan !== 'free') {
    button.textContent = planInfo.active ? 'Plano Ativo' : 'Plano Atual';
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
  }

  // Desabilitar botões de planos inferiores ao atual (se houver assinatura ativa)
  if (planInfo.active) {
    const allPlanCards = document.querySelectorAll('[data-plan]');
    
    allPlanCards.forEach(card => {
      const planType = card.getAttribute('data-plan');
      const cardButton = card.querySelector('.plan-card__cta');
      
      if (!cardButton || planType === 'free') return;
      
      // Se é o mesmo plano ou inferior, desabilitar
      if (arePlansEqual(planType, currentPlan) || isPlanLower(planType, currentPlan)) {
        cardButton.textContent = arePlansEqual(planType, currentPlan) 
          ? 'Plano Ativo' 
          : 'Não Disponível';
        cardButton.disabled = true;
        cardButton.style.opacity = '0.5';
        cardButton.style.cursor = 'not-allowed';
        cardButton.style.filter = 'grayscale(0.5)';
        
        // Adicionar tooltip explicativo
        cardButton.title = arePlansEqual(planType, currentPlan)
          ? 'Você já possui este plano ativo'
          : `Não é possível fazer downgrade de ${getPlanName(currentPlan)} para ${getPlanName(planType)}`;
      }
      // Se é upgrade válido, destacar
      else if (isValidUpgrade(currentPlan, planType)) {
        cardButton.textContent = '✨ Fazer Upgrade';
        cardButton.style.background = 'linear-gradient(135deg, #20c978, #17a85f)';
        cardButton.style.animation = 'pulse 2s infinite';
      }
    });
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

