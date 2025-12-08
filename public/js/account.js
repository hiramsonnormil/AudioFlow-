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
  free: '🆓',
  voz_pro: '⭐',
  voz_master: '👑'
};

const planPricing = {
  free: 0,
  voz_pro: 1490,
  voz_master: 150
};

async function fetchSubscriptionData() {
  const token = getToken();
  const user = getUser();
  
  if (!user?._id) {
    throw new Error('Usuário não autenticado');
  }

  const response = await fetch(`/api/subscriptions/${user._id}/status`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  // Se não tem subscription (404), retorna null
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error('Erro ao carregar dados da assinatura');
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

function renderAccountPage(subscriptionData) {
  const container = document.getElementById('accountContent');
  
  console.log('[ACCOUNT] Subscription data:', subscriptionData);
  
  // Pegar user do localStorage
  const user = getUser();
  
  if (!user) {
    renderError('Dados do usuário não encontrados');
    return;
  }

  // subscriptionData pode ser null/undefined se não tiver subscription
  const subscription = subscriptionData?.error ? null : subscriptionData;

  const currentPlan = user.plan || 'free';
  const planName = planNames[currentPlan] || currentPlan;
  const planIcon = planIcons[currentPlan] || '📦';

  let subscriptionSection = '';

  if (subscription && subscription.status === 'active') {
    const nextBilling = formatDate(subscription.nextBillingDate);
    const monthlyAmountSource = subscription?.monthlyAmount ?? planPricing[subscription?.planType] ?? planPricing[currentPlan] ?? 0;
    const monthlyAmountCents = typeof monthlyAmountSource === 'string' ? Number(monthlyAmountSource) : monthlyAmountSource;
    const monthlyAmount = formatCurrency(monthlyAmountCents);

    subscriptionSection = `
      <div class="account-card">
        <h2>💳 Assinatura Ativa</h2>
        <div class="plan-info-grid">
          <div class="plan-info-row">
            <span class="plan-info-label">Valor Mensal</span>
            <span class="plan-info-value subscription-highlight">${monthlyAmount}</span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Próxima Cobrança</span>
            <span class="plan-info-value">${nextBilling}</span>
          </div>
          <div class="plan-info-row">
            <span class="plan-info-label">Método de Pagamento</span>
            <span class="plan-info-value">PIX</span>
          </div>
        </div>
      </div>
    `;
  } else if (subscription?.pendingPayment) {
    const pendingAmountLabel = formatCurrency(subscription.pendingPayment.value);

    subscriptionSection = `
      <div class="account-card">
        <h2>⏳ Pagamento Pendente</h2>
        <p style="color: var(--text-secondary); margin: 1rem 0 1.5rem;">
          Você possui um código PIX aguardando pagamento. Após a confirmação, seu plano será ativado automaticamente.
        </p>
        <div class="plan-info-grid" style="margin-bottom: 1rem;">
          <div class="plan-info-row">
            <span class="plan-info-label">Valor do PIX</span>
            <span class="plan-info-value subscription-highlight">${pendingAmountLabel}</span>
          </div>
        </div>
        <div class="account-actions">
          <a href="/plans" class="btn-account btn-account-secondary">Ver Código PIX</a>
        </div>
      </div>
    `;
  } else {
    subscriptionSection = `
      <div class="account-card">
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>Nenhuma assinatura ativa</h3>
          <p>Você está usando o plano gratuito</p>
        </div>
        <div class="account-actions">
          <a href="/plans" class="btn-account btn-account-primary">Ver Planos Disponíveis</a>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="account-card">
      <h2>👤 Informações do Plano</h2>
      <div class="plan-info-grid">
        <div class="plan-info-row">
          <span class="plan-info-label">Plano Atual</span>
          <span class="plan-badge ${currentPlan}">
            ${planIcon} ${planName}
          </span>
        </div>
        <div class="plan-info-row">
          <span class="plan-info-label">Email</span>
          <span class="plan-info-value">${user.email}</span>
        </div>
        <div class="plan-info-row">
          <span class="plan-info-label">Usuário</span>
          <span class="plan-info-value">${user.username}</span>
        </div>
      </div>
      ${currentPlan !== 'free' ? '' : `
        <div class="account-actions">
          <a href="/plans" class="btn-account btn-account-primary">
            ✨ Upgrade para Premium
          </a>
        </div>
      `}
    </div>

    ${subscriptionSection}
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

async function init() {
  // Verificar autenticação
  if (!isAuthenticated()) {
    window.location.href = '/?login=required';
    return;
  }

  try {
    const data = await fetchSubscriptionData();
    console.log('[ACCOUNT] Fetched data:', data);
    renderAccountPage(data);
  } catch (error) {
    console.error('[ACCOUNT] Erro ao carregar conta:', error);
    renderError(error.message || 'Ocorreu um erro inesperado');
  }
}

// Initialize on page load
init();
