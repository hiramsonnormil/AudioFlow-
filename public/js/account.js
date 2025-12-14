/**
 * Account Page - Minha Conta
 * Mostra informações do plano, próximas cobranças e histórico
 */

import { getToken, getUser, isAuthenticated } from './auth/session.js';

const planNames = {
  free: 'Gratuito',
  voz_pro: 'Voz Pro',
  voz_master: 'Voz Master'
};

const planIcons = {
  free: '🎧',
  voz_pro: '⭐',
  voz_master: '👑'
};

const planDescriptions = {
  free: 'Plano básico para experimentar',
  voz_pro: 'Processamento ilimitado + recursos avançados',
  voz_master: 'Tudo do Pro + prioridade máxima'
};

const planPricing = {
  free: 0,
  voz_pro: 1490,
  voz_master: 150
};

async function fetchAccountData() {
  const token = getToken();
  
  if (!token) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch('/api/account/status', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Erro ao carregar dados da conta');
  }

  return response.json();
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatCurrency(cents) {
  const value = typeof cents === 'string' ? Number(cents) : cents;

  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'R$ 0,00';
  }

  return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
}

function renderAccountPage(accountData) {
  const container = document.getElementById('accountContent');
  
  console.log('[ACCOUNT] Account data:', accountData);
  
  if (!accountData?.user) {
    renderError('Dados do usuário não encontrados');
    return;
  }

  const { user, subscription, pendingPayment, paymentHistory } = accountData;
  
  const currentPlan = user.plan || 'free';
  const planName = planNames[currentPlan] || currentPlan;
  const planIcon = planIcons[currentPlan] || '📦';
  const planDescription = planDescriptions[currentPlan] || '';
  
  const memberSince = formatDate(user.memberSince);

  let subscriptionSection = '';
  let paymentHistorySection = '';

  if (subscription && subscription.status === 'active') {
    const nextBilling = formatDate(subscription.expiresAt);
    const monthlyAmount = formatCurrency(subscription.value);
    const daysRemaining = subscription.daysRemaining || 0;

    subscriptionSection = `
      <div class="account-card subscription-active">
        <h2>💎 Assinatura Ativa</h2>
        <div class="subscription-status-badge active">
          <span class="status-dot"></span>
          <span>Ativo</span>
        </div>
        <div class="plan-info-grid">
          <div class="plan-info-row">
            <span class="plan-info-label">Plano</span>
            <span class="plan-badge ${subscription.plan}">
              ${planIcons[subscription.plan] || '⭐'} ${planNames[subscription.plan] || subscription.plan}
            </span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Valor Mensal</span>
            <span class="plan-info-value subscription-highlight">${monthlyAmount}</span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Renovação</span>
            <span class="plan-info-value">${nextBilling}</span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Dias Restantes</span>
            <span class="plan-info-value">${daysRemaining} dias</span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Método de Pagamento</span>
            <span class="plan-info-value">PIX</span>
          </div>
        </div>
      </div>
    `;
  } else if (pendingPayment) {
    const pendingAmountLabel = formatCurrency(pendingPayment.value);
    const pendingDate = formatDate(pendingPayment.createdAt);

    subscriptionSection = `
      <div class="account-card subscription-pending">
        <h2>⏳ Pagamento Pendente</h2>
        <div class="subscription-status-badge pending">
          <span class="status-dot"></span>
          <span>Aguardando Pagamento</span>
        </div>
        <p style="color: var(--text-secondary); margin: 1rem 0 1.5rem;">
          Você possui um código PIX aguardando pagamento. Após a confirmação, seu plano <strong>${planNames[pendingPayment.plan] || pendingPayment.plan}</strong> será ativado automaticamente.
        </p>
        <div class="plan-info-grid" style="margin-bottom: 1rem;">
          <div class="plan-info-row">
            <span class="plan-info-label">Valor do PIX</span>
            <span class="plan-info-value subscription-highlight">${pendingAmountLabel}</span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Criado em</span>
            <span class="plan-info-value">${pendingDate}</span>
          </div>
        </div>
        <div class="account-actions">
          <a href="/plans" class="btn-account btn-account-primary">Ver Código PIX</a>
        </div>
      </div>
    `;
  } else {
    subscriptionSection = `
      <div class="account-card subscription-free">
        <div class="empty-state">
          <div class="empty-state-icon">🎧</div>
          <h3>Plano Gratuito</h3>
          <p>Você está usando o plano gratuito. Faça upgrade para desbloquear recursos premium!</p>
        </div>
        <div class="account-actions">
          <a href="/plans" class="btn-account btn-account-primary">
            ✨ Ver Planos Premium
          </a>
          <button onclick="syncPlan()" class="btn-account btn-account-secondary">
            🔄 Sincronizar Plano
          </button>
        </div>
      </div>
    `;
  }

  // Payment History
  if (paymentHistory && paymentHistory.length > 0) {
    const historyItems = paymentHistory.map(payment => {
      const statusClass = payment.status === 'completed' ? 'success' : payment.status === 'pending' ? 'warning' : 'error';
      const statusIcon = payment.status === 'completed' ? '✓' : payment.status === 'pending' ? '⏳' : '✗';
      const statusText = payment.status === 'completed' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : 'Cancelado';
      
      return `
        <div class="payment-history-item">
          <div class="payment-info">
            <span class="payment-plan">${planNames[payment.plan] || payment.plan}</span>
            <span class="payment-date">${formatDate(payment.date)}</span>
          </div>
          <div class="payment-status-group">
            <span class="payment-value">${formatCurrency(payment.value)}</span>
            <span class="payment-status ${statusClass}">${statusIcon} ${statusText}</span>
          </div>
        </div>
      `;
    }).join('');

    paymentHistorySection = `
      <div class="account-card">
        <h2>📜 Histórico de Pagamentos</h2>
        <div class="payment-history-list">
          ${historyItems}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="account-card user-profile">
      <h2>👤 Perfil</h2>
      <div class="plan-info-grid">
        <div class="plan-info-row">
          <span class="plan-info-label">Nome de Usuário</span>
          <span class="plan-info-value">${user.username}</span>
        </div>
        <div class="plan-info-row">
          <span class="plan-info-label">Email</span>
          <span class="plan-info-value">${user.email}</span>
        </div>
        <div class="plan-info-row">
          <span class="plan-info-label">Membro desde</span>
          <span class="plan-info-value">${memberSince}</span>
        </div>
        <div class="plan-info-row">
          <span class="plan-info-label">Plano Atual</span>
          <span class="plan-badge ${currentPlan}">
            ${planIcon} ${planName}
          </span>
        </div>
      </div>
      <div class="plan-description">
        <p>${planDescription}</p>
      </div>
    </div>

    ${subscriptionSection}
    
    ${paymentHistorySection}
  `;
}

function renderError(message) {
  const container = document.getElementById('accountContent');
  container.innerHTML = `
    <div class="account-card">
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Erro ao carregar dados</h3>
        <p>${message}</p>
      </div>
      <div class="account-actions">
        <button onclick="location.reload()" class="btn-account btn-account-secondary">Tentar Novamente</button>
      </div>
    </div>
  `;
}

// Função para sincronizar plano manualmente
window.syncPlan = async function() {
  const token = getToken();
  
  if (!token) {
    alert('Erro: Você não está autenticado');
    return;
  }

  try {
    const button = event?.target;
    if (button) {
      button.disabled = true;
      button.textContent = '🔄 Sincronizando...';
    }

    const response = await fetch('/api/account/sync-plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao sincronizar plano');
    }

    const result = await response.json();
    console.log('[SYNC] Resultado:', result);
    
    // Recarregar dados da conta
    const data = await fetchAccountData();
    renderAccountPage(data);
    
    alert(result.message || 'Plano sincronizado com sucesso!');
  } catch (error) {
    console.error('[SYNC] Erro:', error);
    alert('Erro ao sincronizar plano. Tente novamente.');
  }
};

async function init() {
  // Verificar autenticação
  if (!isAuthenticated()) {
    window.location.href = '/?login=required';
    return;
  }

  try {
    const data = await fetchAccountData();
    console.log('[ACCOUNT] Fetched data:', data);
    renderAccountPage(data);
  } catch (error) {
    console.error('[ACCOUNT] Erro ao carregar conta:', error);
    renderError(error.message || 'Ocorreu um erro inesperado');
  }
}

// Initialize on page load
init();
