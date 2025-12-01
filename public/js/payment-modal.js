/**
 * Payment Modal
 * Gerencia modal de pagamento com PIX e cartão de crédito
 */

import { getToken } from "./auth/session.js";

let currentSubscriptionId = null;
let paymentCheckInterval = null;

/**
 * Abrir modal de pagamento
 */
export function openPaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (!modal) return;

  modal.classList.add("active");
  document.body.classList.add("modal-open");

  // Resetar formulários
  resetPaymentForms();
}

/**
 * Fechar modal de pagamento
 */
export function closePaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (!modal) return;

  modal.classList.remove("active");
  document.body.classList.remove("modal-open");

  // Limpar intervalos
  if (paymentCheckInterval) {
    clearInterval(paymentCheckInterval);
    paymentCheckInterval = null;
  }

  // Resetar formulários
  resetPaymentForms();
}

/**
 * Resetar formulários de pagamento
 */
function resetPaymentForms() {
  const pixForm = document.getElementById("pixPaymentForm");
  const cardForm = document.getElementById("cardPaymentForm");
  const pixSuccess = document.getElementById("pixPaymentSuccess");
  const cardSuccess = document.getElementById("cardPaymentSuccess");

  if (pixForm) pixForm.style.display = "block";
  if (cardForm) cardForm.style.display = "none";
  if (pixSuccess) pixSuccess.style.display = "none";
  if (cardSuccess) cardSuccess.style.display = "none";

  currentSubscriptionId = null;
}

/**
 * Alternar entre métodos de pagamento
 */
function switchPaymentMethod(method) {
  const pixTab = document.getElementById("paymentTabPix");
  const cardTab = document.getElementById("paymentTabCard");
  const pixForm = document.getElementById("pixPaymentForm");
  const cardForm = document.getElementById("cardPaymentForm");

  if (method === "pix") {
    pixTab?.classList.add("active");
    cardTab?.classList.remove("active");
    pixForm.style.display = "block";
    cardForm.style.display = "none";
  } else {
    pixTab?.classList.remove("active");
    cardTab?.classList.add("active");
    pixForm.style.display = "none";
    cardForm.style.display = "block";
  }
}

/**
 * Criar pagamento PIX
 */
async function handlePixPayment(e) {
  e.preventDefault();

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById("paymentError");
  const pixForm = document.getElementById("pixPaymentForm");
  const pixSuccess = document.getElementById("pixPaymentSuccess");

  // Mostrar loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Processando...';
  errorDiv.style.display = "none";

  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar logado para fazer o pagamento");
    }

    const response = await fetch("/api/payment/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao processar pagamento PIX");
    }

    // Salvar subscription ID
    currentSubscriptionId = data.subscription.id;

    // Mostrar QR Code e código copia e cola
    const qrCodeImg = document.getElementById("pixQrCode");
    const copyPasteCode = document.getElementById("pixCopyPaste");
    const copyBtn = document.getElementById("copyPixCodeBtn");

    if (data.payment.qrCodeBase64) {
      qrCodeImg.src = `data:image/png;base64,${data.payment.qrCodeBase64}`;
      qrCodeImg.style.display = "block";
    } else if (data.payment.qrCode) {
      qrCodeImg.src = data.payment.qrCode;
      qrCodeImg.style.display = "block";
    }

    if (data.payment.copyPaste) {
      copyPasteCode.textContent = data.payment.copyPaste;
      copyPasteCode.style.display = "block";
    }

    // Configurar botão de copiar
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(data.payment.copyPaste);
        copyBtn.textContent = "✓ Copiado!";
        setTimeout(() => {
          copyBtn.textContent = "Copiar código";
        }, 2000);
      };
    }

    // Esconder formulário e mostrar sucesso
    pixForm.style.display = "none";
    pixSuccess.style.display = "block";

    // Iniciar verificação periódica do status
    startPaymentStatusCheck();
  } catch (error) {
    console.error("❌ [PAYMENT] Erro ao criar pagamento PIX:", error);
    errorDiv.textContent = error.message || "Erro ao processar pagamento. Tente novamente.";
    errorDiv.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Gerar QR Code PIX";
  }
}

/**
 * Criar pagamento com cartão
 */
async function handleCardPayment(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const errorDiv = document.getElementById("paymentError");
  const cardForm = document.getElementById("cardPaymentForm");
  const cardSuccess = document.getElementById("cardPaymentSuccess");

  // Coletar dados do formulário
  const cardData = {
    number: form.cardNumber.value.replace(/\s/g, ""),
    holderName: form.cardHolderName.value,
    expiryMonth: form.cardExpiryMonth.value,
    expiryYear: form.cardExpiryYear.value,
    cvv: form.cardCvv.value,
  };

  // Validações básicas
  if (!cardData.number || cardData.number.length < 13) {
    errorDiv.textContent = "Número do cartão inválido";
    errorDiv.style.display = "block";
    return;
  }

  if (!cardData.holderName || cardData.holderName.length < 3) {
    errorDiv.textContent = "Nome do portador inválido";
    errorDiv.style.display = "block";
    return;
  }

  // Mostrar loading
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Processando...';
  errorDiv.style.display = "none";

  try {
    const token = getToken();
    if (!token) {
      throw new Error("Você precisa estar logado para fazer o pagamento");
    }

    const response = await fetch("/api/payment/card", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cardData }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Erro ao processar pagamento com cartão");
    }

    // Salvar subscription ID
    currentSubscriptionId = data.subscription.id;

    // Se pagamento aprovado imediatamente
    if (data.payment.status === "approved" || data.payment.status === "paid") {
      cardForm.style.display = "none";
      cardSuccess.style.display = "block";
      cardSuccess.querySelector(".payment-success-message").textContent =
        "Pagamento aprovado! Sua assinatura Premium está ativa.";

      // Redirecionar após alguns segundos
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } else {
      // Pagamento pendente
      cardForm.style.display = "none";
      cardSuccess.style.display = "block";
      cardSuccess.querySelector(".payment-success-message").textContent =
        "Pagamento em processamento. Aguarde a confirmação...";

      // Iniciar verificação periódica
      startPaymentStatusCheck();
    }
  } catch (error) {
    console.error("❌ [PAYMENT] Erro ao criar pagamento com cartão:", error);
    errorDiv.textContent = error.message || "Erro ao processar pagamento. Verifique os dados do cartão.";
    errorDiv.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.innerHTML = "Finalizar pagamento";
  }
}

/**
 * Verificar status do pagamento periodicamente
 */
function startPaymentStatusCheck() {
  if (paymentCheckInterval) return;

  paymentCheckInterval = setInterval(async () => {
    if (!currentSubscriptionId) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/payment/subscription/${currentSubscriptionId}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.subscription.status === "active") {
        // Pagamento confirmado!
        clearInterval(paymentCheckInterval);
        paymentCheckInterval = null;

        // Mostrar mensagem de sucesso
        const pixSuccess = document.getElementById("pixPaymentSuccess");
        const cardSuccess = document.getElementById("cardPaymentSuccess");

        if (pixSuccess && pixSuccess.style.display !== "none") {
          pixSuccess.querySelector(".payment-success-message").textContent =
            "Pagamento confirmado! Sua assinatura Premium está ativa.";
        }

        if (cardSuccess && cardSuccess.style.display !== "none") {
          cardSuccess.querySelector(".payment-success-message").textContent =
            "Pagamento confirmado! Sua assinatura Premium está ativa.";
        }

        // Redirecionar após alguns segundos
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    } catch (error) {
      console.error("❌ [PAYMENT] Erro ao verificar status:", error);
    }
  }, 5000); // Verificar a cada 5 segundos
}

/**
 * Formatar número do cartão
 */
function formatCardNumber(input) {
  let value = input.value.replace(/\s/g, "");
  let formattedValue = value.match(/.{1,4}/g)?.join(" ") || value;
  if (formattedValue.length > 19) formattedValue = formattedValue.slice(0, 19);
  input.value = formattedValue;
}

/**
 * Inicializar modal de pagamento
 */
export function initPaymentModal() {
  const modal = document.getElementById("paymentModal");
  if (!modal) return;

  // Botões de fechar
  const closeBtn = document.getElementById("closePaymentModal");
  const overlay = modal.querySelector(".modal-overlay");

  if (closeBtn) {
    closeBtn.addEventListener("click", closePaymentModal);
  }

  if (overlay) {
    overlay.addEventListener("click", closePaymentModal);
  }

  // Tabs de método de pagamento
  const pixTab = document.getElementById("paymentTabPix");
  const cardTab = document.getElementById("paymentTabCard");

  if (pixTab) {
    pixTab.addEventListener("click", () => switchPaymentMethod("pix"));
  }

  if (cardTab) {
    cardTab.addEventListener("click", () => switchPaymentMethod("card"));
  }

  // Formulários
  const pixForm = document.getElementById("pixPaymentForm");
  const cardForm = document.getElementById("cardPaymentForm");

  if (pixForm) {
    pixForm.addEventListener("submit", handlePixPayment);
  }

  if (cardForm) {
    cardForm.addEventListener("submit", handleCardPayment);

    // Formatar número do cartão
    const cardNumberInput = cardForm.querySelector('input[name="cardNumber"]');
    if (cardNumberInput) {
      cardNumberInput.addEventListener("input", () => formatCardNumber(cardNumberInput));
    }
  }
}

// Inicializar quando DOM estiver pronto
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPaymentModal);
} else {
  initPaymentModal();
}



