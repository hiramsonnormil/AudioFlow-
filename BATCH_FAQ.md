# ❓ FAQ - Processamento em Massa

## ⚙️ Instalação & Setup

### P: Preciso instalar algo novo?

**R:** Não! Usa apenas o Express, yt-dlp e FFmpeg que já estão configurados.

### P: Como começo?

**R:**

1. Certifique-se que `yt-dlp` e `ffmpeg` estão instalados
2. Rode `npm start` ou `npm run dev`
3. Acesse `http://localhost:8080/batch.html`

---

## 🎯 Funcionalidades

### P: Qual é o máximo de URLs?

**R:** 10 URLs por lote. Se precisar processar mais, crie outro lote.

### P: Posso processar com presets diferentes ao mesmo tempo?

**R:** Sim! Cada URL pode ter um preset diferente:

- Criar um lote com SLOWED
- Depois criar outro lote com NIGHTCORE
- Tudo processa simultaneamente

### P: O servidor aguarda o processamento terminar?

**R:** Não! A resposta é quase instantânea (<10ms):

```json
{ "id": "abc123xyz" }
```

O processamento acontece em background.

### P: Como acompanho o progresso?

**R:** O JavaScript faz polling a cada 500ms:

```javascript
GET / status / abc123xyz;
```

A UI atualiza em tempo real com a barra de progresso.

---

## 📊 Performance & Limites

### P: Quantos jobs podem rodar ao mesmo tempo?

**R:** Máximo 10 simultâneos. É um limite de concorrência para:

- Evitar sobrecarga de CPU
- Manter qualidade de processamento
- Não travar o servidor

### P: E se adicionar 10 jobs e depois mais 10?

**R:**

1. Primeiros 10 começam a processar
2. Próximos 10 ficam em PENDING
3. Conforme cada termina, a fila avança
4. Tudo automático!

### P: Quanto tempo leva para processar?

**R:** Depende da música e do efeito:

- SLOWED: ~15-20s (música 3min)
- NIGHTCORE: ~15-20s
- ULTRA_SLOWED: ~30-40s (mais complexo)

### P: Com 10 simultâneos, fica mais lento?

**R:** Um pouco sim, mas é mínimo:

- 1 música: 15s
- 10 simultâneos: ~20-25s cada (14% mais lento)
- Compensa pela paralelização

---

## 🎨 Interface & UX

### P: Posso adicionar URLs de formas diferentes?

**R:** Sim, 3 jeitos:

1. Digite uma URL no campo e clique "Adicionar"
2. Cole múltiplas na textarea (uma por linha)
3. Combine: adicione 1 + texto múltiplo

### P: Como removo uma URL?

**R:** Clique no ❌ ao lado da URL na lista

### P: Posso limpar tudo?

**R:** Sim! Botão "Limpar" limpa URLs e jobs

### P: O que significam as cores?

**R:**

- 🔵 Azul = Aguardando/Baixando/Extraindo
- 🟡 Amarelo = Processando
- 🟢 Verde = Concluído
- 🔴 Vermelho = Erro

### P: Onde fico os arquivos processados?

**R:** Em `/storage/out/` no servidor

### P: Posso baixar múltiplos como ZIP?

**R:** Não ainda (sugestão de melhoria)

---

## 📱 Responsividade

### P: Funciona em mobile?

**R:** Sim! Layout se adapta:

- Desktop: 2 colunas (formulário + fila)
- Mobile: 1 coluna (empilhado)
- Todos os botões são clicáveis
- Scroll suave na fila

### P: A fila atualiza em tempo real?

**R:** Sim! Polling a cada 500ms

### P: Posso fechar a página enquanto processa?

**R:** Sim! O servidor continua processando.
Mas você não verá o progresso.

---

## 🔒 Segurança

### P: URLs inválidas são aceitas?

**R:** Não! Valida:

- Domínio YouTube (youtube.com ou youtu.be)
- Formato de URL válido
- Duplicatas são detectadas

### P: Que presets estão disponíveis?

**R:** 8 presets validados no servidor:

```
SLOWED, SPEED_125, ULTRA_SLOWED, MUFFLED_SLOWED,
MUFFLED_SPEED, DAYCORE, NIGHTCORE, 8D
```

### P: Caracteres especiais nos nomes quebram?

**R:** Não! Sanitiza automaticamente:

- Remove caracteres especiais
- Converte espaços para underscores
- Limita tamanho do nome

---

## 🐛 Troubleshooting

### P: Meu job fica em "Aguardando" para sempre

**R:** Possíveis causas:

1. 10 jobs já estão processando
2. Verifique se servidor está rodando
3. Recarregue a página

### P: "URL inválida" mesmo com link correto

**R:** Tente estas URLs:

```
✅ https://www.youtube.com/watch?v=VIDEO_ID
✅ https://youtu.be/VIDEO_ID
❌ youtube.com/watch?v=VIDEO_ID (sem https)
```

### P: Arquivo não aparece para download

**R:**

1. Aguarde status ficar verde
2. Se erro aparecer, veja a mensagem
3. Comum: vídeo privado ou removido

### P: "File not found" ao clicar download

**R:** Arquivo pode ter sido deletado do servidor.
Reprocesse o job.

### P: Tudo virou lento

**R:** Possibilidades:

1. 10 jobs pesados processando
2. Disco cheio em `/storage/out/`
3. Internet lenta

### P: FFmpeg ou yt-dlp não encontrado

**R:** Instale:

```bash
# FFmpeg
sudo apt install ffmpeg

# yt-dlp
pip install yt-dlp
```

---

## 🔧 Configuração Avançada

### P: Como mudo o máximo de simultâneos?

**R:** No `server.js`, mude:

```javascript
const MAX_CONCURRENT_JOBS = 10; // Para 20, 5, etc
```

### P: Como mudo o intervalo de polling?

**R:** No `batch.js`, mude:

```javascript
manager.pollInterval = setInterval(pollJobs, 500); // 500ms para 1000ms, etc
```

### P: Posso aumentar o bitrate?

**R:** No `server.js` (função `processJob`):

```javascript
"-b:a", "192k"; // Para 320k, 128k, etc
```

### P: Como limpo arquivos antigos?

**R:** Rodando periodicamente:

```bash
find /storage/out -mtime +7 -delete  # Remove 7+ dias
```

---

## 📈 Monitoramento

### P: Como vejo quantos jobs estão na fila?

**R:** Acesse `/queue-stats`:

```bash
curl http://localhost:8080/queue-stats
```

Ou na UI: painel de estatísticas na página batch

### P: Como vejo o log do servidor?

**R:** Procure por `[JOB_ID]` no console:

```
[abc123] New job queued: SLOWED
[abc123] Extracting metadata from URL...
[abc123] Output filename: titulo_slowed.mp3
```

---

## 💡 Dicas & Truques

### Dica 1: Testar rapidinho

```bash
curl -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ","preset":"SLOWED"}'
```

### Dica 2: Monitorar a fila em tempo real

```bash
watch -n 0.5 "curl -s http://localhost:8080/queue-stats | jq '.'"
```

### Dica 3: Contar arquivos processados

```bash
ls /storage/out/ | wc -l
```

### Dica 4: Dark mode é automático

Usa `localStorage.setItem('theme', 'dark')` ou `'light'`

---

## 📚 Endpoints API

| Método | URL            | Descrição           |
| ------ | -------------- | ------------------- |
| POST   | `/process`     | Criar novo job      |
| GET    | `/status/:id`  | Status de um job    |
| GET    | `/queue-stats` | Estatísticas gerais |
| GET    | `/file/:id`    | Download arquivo    |

### POST /process

```json
Request:
{
  "url": "https://youtu.be/dQw4w9WgXcQ",
  "preset": "SLOWED"
}

Response (200):
{
  "id": "abc123xyz"
}

Response (400):
{
  "error": "missing url or preset"
}
```

### GET /status/:id

```json
Response (200):
{
  "id": "abc123xyz",
  "status": "PROCESSING",
  "progress": 45,
  "title": "Never Gonna Give You Up",
  "filename": "never_gonna_give_you_up_slowed.mp3",
  "thumbnail": "https://i.ytimg.com/...",
  "videoId": "dQw4w9WgXcQ"
}

Response (404):
{
  "error": "not found"
}
```

### GET /queue-stats

```json
Response:
{
  "total": 10,
  "pending": 3,
  "processing": 2,
  "done": 5,
  "error": 0,
  "activeJobs": 2,
  "maxConcurrent": 10,
  "queueLength": 3
}
```

---

## 🎬 Casos de Uso

### Caso 1: Criar playlist remixada

1. Adicione 10 URLs diferentes
2. Selecione preset "NIGHTCORE"
3. Processe tudo
4. Baixe todos os arquivos

### Caso 2: Testar efeitos

1. Mesma música, 8 presets diferentes
2. Crie 2 lotes (máx 10)
3. Compare os resultados

### Caso 3: Produção em massa

1. 50 músicas para processar
2. Lote 1: URLs 1-10
3. Lote 2: URLs 11-20
4. Lote 3: URLs 21-30
5. Tudo processa paralelo

---

## 📞 Suporte

**Erro não listado aqui?**

1. Veja console do navegador (F12)
2. Veja logs do servidor
3. Verifique `/queue-stats` para ver fila

**Quer solicitar uma feature?**
Veja arquivo `BATCH_SUMMARY.md` para ideias!
