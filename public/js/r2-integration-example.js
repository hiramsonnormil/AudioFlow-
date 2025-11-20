/**
 * Exemplo de integração do frontend com API R2
 * 
 * Este arquivo mostra como consumir os endpoints de processamento
 * e listagem de arquivos no frontend.
 */

// ===== EXEMPLO 1: Processar áudio (usuário free) =====

async function processarAudioFree(videoUrl, preset) {
  try {
    const response = await fetch('/api/free/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Se usar autenticação JWT:
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        url: videoUrl,
        preset: preset // 'NIGHTCORE', 'SLOWED', etc
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Processamento concluído!');
      console.log('Download URL:', data.downloadUrl);
      console.log('Expira em:', data.metadata.expiresIn);
      
      // Mostrar link de download para o usuário
      mostrarLinkDownload(data.downloadUrl, data.metadata.title);
      
      // Opcional: atualizar lista de processamentos recentes
      atualizarListaRecentes();
      
      return data;
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('❌ Erro ao processar:', error);
    alert(`Erro: ${error.message}`);
    throw error;
  }
}

// ===== EXEMPLO 2: Listar processamentos recentes =====

async function listarProcessamentosRecentes() {
  try {
    const response = await fetch('/api/free/recent', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Se usar autenticação JWT:
        // 'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (data.success) {
      console.log(`📋 ${data.total} processamento(s) encontrado(s)`);
      
      // Renderizar lista
      renderizarListaProcessamentos(data.processamentos);
      
      return data.processamentos;
    } else {
      throw new Error(data.error || 'Erro ao listar');
    }
  } catch (error) {
    console.error('❌ Erro ao listar:', error);
    return [];
  }
}

// ===== EXEMPLO 3: Renderizar lista no HTML =====

function renderizarListaProcessamentos(processamentos) {
  const container = document.getElementById('lista-processamentos');
  
  if (!container) return;
  
  if (processamentos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Nenhum processamento recente</p>
        <p class="text-muted">Seus áudios processados aparecerão aqui por até 1 hora</p>
      </div>
    `;
    return;
  }
  
  const html = processamentos.map(proc => `
    <div class="processamento-card" data-job-id="${proc.jobId}">
      <div class="info">
        <h4>${proc.fileName}</h4>
        <div class="meta">
          <span class="badge">Expira em ${proc.expiresInMinutes} min</span>
          <span class="size">${formatarTamanho(proc.size)}</span>
          <span class="data">${formatarData(proc.createdAt)}</span>
        </div>
      </div>
      <div class="actions">
        <a href="${proc.downloadUrl}" 
           class="btn btn-primary" 
           download="${proc.fileName}">
          <i class="icon-download"></i> Baixar
        </a>
        <button class="btn btn-secondary" 
                onclick="copiarLink('${proc.downloadUrl}')">
          <i class="icon-link"></i> Copiar Link
        </button>
      </div>
      <div class="expiration-bar">
        <div class="progress" style="width: ${calcularProgresso(proc.expiresInMinutes)}%"></div>
      </div>
    </div>
  `).join('');
  
  container.innerHTML = html;
}

// ===== EXEMPLO 4: Funções auxiliares =====

function formatarTamanho(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatarData(isoString) {
  const data = new Date(isoString);
  const agora = new Date();
  const diff = Math.floor((agora - data) / 1000 / 60); // minutos
  
  if (diff < 1) return 'Agora mesmo';
  if (diff === 1) return '1 minuto atrás';
  if (diff < 60) return `${diff} minutos atrás`;
  
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function calcularProgresso(minutosRestantes) {
  // 60 minutos = 100%
  return Math.max(0, (minutosRestantes / 60) * 100);
}

function mostrarLinkDownload(url, titulo) {
  // Criar elemento temporário para mostrar o link
  const modal = document.createElement('div');
  modal.className = 'download-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h3>✅ Processamento Concluído!</h3>
      <p>${titulo}</p>
      <a href="${url}" class="btn btn-lg btn-success" download>
        <i class="icon-download"></i> Baixar Agora
      </a>
      <button onclick="copiarLink('${url}')" class="btn btn-secondary">
        Copiar Link
      </button>
      <p class="text-muted">⏰ Este arquivo ficará disponível por 1 hora</p>
      <button onclick="this.closest('.download-modal').remove()" class="btn-close">
        Fechar
      </button>
    </div>
  `;
  document.body.appendChild(modal);
}

function copiarLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert('✅ Link copiado para a área de transferência!');
  }).catch(err => {
    console.error('Erro ao copiar:', err);
    // Fallback para navegadores antigos
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    alert('✅ Link copiado!');
  });
}

// ===== EXEMPLO 5: Auto-atualização da lista =====

// Atualiza a lista a cada 30 segundos
let intervalId = null;

function iniciarAutoAtualizacao() {
  // Atualiza imediatamente
  atualizarListaRecentes();
  
  // Depois a cada 30s
  intervalId = setInterval(atualizarListaRecentes, 30000);
}

function pararAutoAtualizacao() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function atualizarListaRecentes() {
  try {
    const processamentos = await listarProcessamentosRecentes();
    
    // Se tiver processamentos, atualiza contador no badge
    const badge = document.getElementById('badge-processamentos');
    if (badge) {
      badge.textContent = processamentos.length;
      badge.style.display = processamentos.length > 0 ? 'inline-block' : 'none';
    }
  } catch (error) {
    console.error('Erro na atualização automática:', error);
  }
}

// ===== EXEMPLO 6: Fluxo completo com UI =====

async function fluxoCompletoProcessamento() {
  // 1. Obter dados do formulário
  const videoUrl = document.getElementById('video-url').value;
  const preset = document.getElementById('preset').value;
  
  // 2. Validar
  if (!videoUrl || !preset) {
    alert('Por favor, preencha todos os campos');
    return;
  }
  
  // 3. Mostrar loading
  const btnProcessar = document.getElementById('btn-processar');
  btnProcessar.disabled = true;
  btnProcessar.innerHTML = '<span class="spinner"></span> Processando...';
  
  try {
    // 4. Fazer requisição
    const result = await processarAudioFree(videoUrl, preset);
    
    // 5. Sucesso - mostrar resultado
    console.log('Processamento concluído:', result);
    
    // 6. Limpar formulário
    document.getElementById('video-url').value = '';
    
  } catch (error) {
    // Erro já foi tratado na função
    console.error('Falha no processamento:', error);
  } finally {
    // 7. Restaurar botão
    btnProcessar.disabled = false;
    btnProcessar.innerHTML = '<i class="icon-magic"></i> Processar Áudio';
  }
}

// ===== EXEMPLO 7: Inicialização ao carregar a página =====

document.addEventListener('DOMContentLoaded', () => {
  console.log('🎵 Phona AudioFlow - R2 Integration');
  
  // Se estiver na página de processamentos recentes
  if (document.getElementById('lista-processamentos')) {
    iniciarAutoAtualizacao();
    
    // Para auto-atualização ao sair da página
    window.addEventListener('beforeunload', pararAutoAtualizacao);
  }
  
  // Se tiver formulário de processamento
  const form = document.getElementById('form-processar');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      fluxoCompletoProcessamento();
    });
  }
});

// ===== EXEMPLO 8: Tratamento de erros específicos =====

function tratarErroProcessamento(error) {
  if (error.message.includes('URL')) {
    return 'URL inválida. Verifique o link do YouTube.';
  }
  if (error.message.includes('preset')) {
    return 'Preset inválido. Escolha um preset válido.';
  }
  if (error.message.includes('duration')) {
    return 'Vídeo muito longo. Máximo: 10 minutos.';
  }
  if (error.message.includes('R2')) {
    return 'Erro no armazenamento. Tente novamente.';
  }
  return 'Erro desconhecido. Contate o suporte.';
}

// ===== EXEMPLO 9: Notificações toast =====

function mostrarNotificacao(tipo, mensagem) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.innerHTML = `
    <div class="toast-content">
      <i class="icon-${tipo}"></i>
      <span>${mensagem}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Anima entrada
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Remove após 3s
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Uso:
// mostrarNotificacao('success', 'Áudio processado com sucesso!');
// mostrarNotificacao('error', 'Erro ao processar áudio');
// mostrarNotificacao('warning', 'Arquivo expira em 10 minutos');

// ===== EXPORT PARA USO EM MÓDULOS =====

export {
  processarAudioFree,
  listarProcessamentosRecentes,
  renderizarListaProcessamentos,
  iniciarAutoAtualizacao,
  pararAutoAtualizacao,
  copiarLink,
  mostrarNotificacao,
};
