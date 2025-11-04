# 📦 Processamento em Massa - Guia Rápido

## O que foi adicionado?

Uma nova funcionalidade de **processamento em massa de até 10 músicas simultaneamente** mantendo a velocidade do site!

## 🎯 Como funciona?

### Gerenciamento de Fila Inteligente

- **Máximo 10 jobs em processamento** ao mesmo tempo
- Outros jobs ficam na **fila de espera** (PENDING)
- Quando um job termina, o próximo da fila começa automaticamente
- O site **continua rápido** porque a requisição retorna imediatamente

### Fluxo de Processamento

1. Cliente envia URL + preset
2. Servidor retorna **ID do job imediatamente** (resposta rápida)
3. Job entra na fila
4. JavaScript faz polling a cada 500ms para obter status
5. UI atualiza em tempo real com progresso

## 📝 Como usar?

### Botão na página inicial

- Clique em **"📦 Lote (10x)"** na página principal

### Formulário de Lote

1. **Selecione o preset** (efeito)
2. **Adicione URLs** de 3 formas:
   - Cole uma URL no campo e clique "Adicionar"
   - Cole múltiplas URLs na textarea (uma por linha)
   - Combine os dois métodos
3. **Veja a contagem**: "URLs adicionadas: X/10"
4. Clique **"Processar tudo (máx 10)"**
5. Acompanhe o progresso em tempo real

## 📊 Painel de Controle

### Estatísticas

- **Total na fila**: Todos os jobs
- **Processando**: Jobs em execução
- **Concluídos**: Jobs prontos para download
- **Erros**: Jobs que falharam

### Cartões de Job

Cada job mostra:

- 📝 Título da música
- 📊 Barra de progresso (0-100%)
- 🆔 ID do job
- 📁 Nome do arquivo (quando concluído)
- ⬇️ Botão de download (quando pronto)
- ⚠️ Mensagem de erro (se houver)

## 🔧 Configuração Técnica

### Limites (no `server.js`)

```javascript
const MAX_CONCURRENT_JOBS = 10; // Máximo simultâneo
```

### Endpoints disponíveis

- `POST /process` - Criar novo job (rápido!)
- `GET /status/:id` - Status do job
- `GET /queue-stats` - Estatísticas gerais da fila
- `GET /file/:id` - Download do arquivo pronto

## ⚡ Performance

### Por que continua rápido?

1. **Resposta imediata**: POST retorna em <10ms
2. **Processamento assíncrono**: FFmpeg roda em background
3. **Limite de concorrência**: Máximo 10 simultâneos evita sobrecarga
4. **Polling eficiente**: JavaScript não bloqueia a UI

### Velocidade de Processamento

- Música de 3min com efeito: ~10-30 segundos
- Com 10 simultâneos: +/- mantém a mesma velocidade individual
- Não há "fila de espera" visível para o cliente

## 📱 Responsividade

- ✅ Desktop: Layout 2 colunas (formulário + fila)
- ✅ Tablet/Mobile: Layout 1 coluna (empilhado)
- ✅ Scroll infinito na fila de jobs
- ✅ Botões e campos adaptativos

## 🎨 UI/UX

### Cores por Status

- 🔵 **PENDING/DOWNLOADING/EXTRACTING**: Azul
- 🟡 **PROCESSING**: Amarelo
- 🟢 **DONE**: Verde
- 🔴 **ERROR**: Vermelho

### Interações

- Adicionar URL com Enter ou botão
- Remover URL com ❌
- Limpar tudo com "Limpar"
- Download com ⬇️

## 🚀 Próximas Melhorias Possíveis

- [ ] Salvar histórico de lotes
- [ ] Exportar múltiplos arquivos como ZIP
- [ ] Prioridade de jobs
- [ ] Pausa/resumo de jobs
- [ ] Webhooks para notificações
- [ ] Limite de upload por IP
- [ ] Preview de música antes/depois

## 📝 Exemplos de URLs

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ
https://youtube.com/watch?v=dQw4w9WgXcQ&t=10s
```

## ❓ Troubleshooting

**P: Por que meu job fica em "PENDING"?**
R: Existem 10 jobs processando. Seu job está na fila e será processado automaticamente.

**P: O arquivo não aparece para download?**
R: Aguarde o status ficar em "Concluído" (verde). Se passar 5 min, pode ter erro.

**P: Posso adicionar mais de 10?**
R: Não, o máximo é 10 por requisição. Você pode fazer outro lote depois.

**P: Os jobs são salvos se eu recarregar a página?**
R: Não, recarregar a página limpa a fila. Mas os arquivos permanecem no servidor.
