```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ARQUITETURA - PROCESSAMENTO EM MASSA                     ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENTE (Navegador)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    batch.html - Interface                            │   │
│  │                                                                      │   │
│  │  ┌─────────────────────────┐  ┌──────────────────────────────────┐  │   │
│  │  │   Formulário            │  │   Fila em Tempo Real             │  │   │
│  │  │                         │  │                                  │  │   │
│  │  │ • URL Input             │  │  Job 1: ████░░░░░ 45%          │  │   │
│  │  │ • Multi-URL Textarea    │  │  Job 2: ██░░░░░░░░ 15%         │  │   │
│  │  │ • Preset Selector       │  │  Job 3: ░░░░░░░░░░ PENDING    │  │   │
│  │  │ • Estatísticas          │  │  Job 4: ████████░░ 75% ✅      │  │   │
│  │  │                         │  │  Job 5: ❌ ERROR                │  │   │
│  │  │ [Processar] [Limpar]    │  │                                  │  │   │
│  │  └─────────────────────────┘  └──────────────────────────────────┘  │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                    ┌───────────────┼───────────────┐                          │
│                    ▼               ▼               ▼                          │
│              POST /process   GET /status/:id  GET /queue-stats               │
│             (add 10 URLs)    (poll 500ms)    (feedback loop)                 │
│                    │               │               │                          │
└────────────────────┼───────────────┼───────────────┼──────────────────────────┘
                     │               │               │
                     │ RÁPIDO!       │               │
                     │ (<10ms)       │               │
                     ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVIDOR (Node.js)                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  API Routes (Express)                                                │   │
│  │  • POST /process          → Enfileira job (retorna ID)              │   │
│  │  • GET /status/:id        → Status + progresso                      │   │
│  │  • GET /queue-stats       → Estatísticas gerais                     │   │
│  │  • GET /file/:id          → Download arquivo                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Gerenciador de Fila                                                │   │
│  │                                                                      │   │
│  │  PENDING_QUEUE = [job6, job7, job8, job9, job10]                   │   │
│  │                                                                      │   │
│  │  processQueue() {                                                    │   │
│  │    while (ACTIVE_JOBS < MAX_CONCURRENT_JOBS && QUEUE.length > 0) { │   │
│  │      job = QUEUE.shift()                                            │   │
│  │      ACTIVE_JOBS++                                                  │   │
│  │      processJob(job)                                                │   │
│  │    }                                                                 │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  │  MAX_CONCURRENT_JOBS = 10  (limita CPU/memória)                     │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Processador de Job (até 10 simultâneos)                            │   │
│  │                                                                      │   │
│  │  processJob(id) {                                                    │   │
│  │    1. EXTRACTING: getYouTubeMetadata()                              │   │
│  │       → Extrai título, duração, thumbnail                           │   │
│  │                                                                      │   │
│  │    2. PROCESSING: Streaming Pipeline                                │   │
│  │       yt-dlp (stdout)                                               │   │
│  │           ▼                                                          │   │
│  │       Pipe (stdin)                                                  │   │
│  │           ▼                                                          │   │
│  │       FFmpeg + Audio Filter                                         │   │
│  │           ▼                                                          │   │
│  │       output.mp3 (arquivo salvo)                                    │   │
│  │                                                                      │   │
│  │    3. DONE: Job concluído com sucesso                               │   │
│  │       └─ Arquivo em /storage/out/                                   │   │
│  │                                                                      │   │
│  │    Error → Job status = ERROR + mensagem                            │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│                                    ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  JOBS Map (Armazena estado)                                          │   │
│  │                                                                      │   │
│  │  {                                                                   │   │
│  │    "abc123": {                                                       │   │
│  │      id: "abc123",                                                   │   │
│  │      status: "PROCESSING" | "DONE" | "ERROR" | "PENDING",          │   │
│  │      progress: 45,                                                   │   │
│  │      title: "Never Gonna Give You Up",                              │   │
│  │      filename: "never_gonna_give_you_up_slowed.mp3",                │   │
│  │      out: "/storage/out/...",                                       │   │
│  │      metadata: { title, duration, thumbnail, videoId },             │   │
│  │      error: null                                                     │   │
│  │    },                                                                │   │
│  │    ...                                                               │   │
│  │  }                                                                   │   │
│  │                                                                      │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA DE ARQUIVOS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  /storage/                                                                   │
│  ├── in/           (entrada, yt-dlp baixa aqui temporariamente)            │
│  ├── out/          (SAÍDA - Arquivos processados)                          │
│  │   ├── musica1_slowed.mp3                                               │
│  │   ├── musica2_nightcore.mp3                                            │
│  │   ├── musica3_8d.mp3                                                   │
│  │   └── ...                                                               │
│  └── meta/         (metadados)                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                          FLUXO DETALHADO DE UM JOB                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─ Cliente ──────────────────────────────────────────────────────────────────┐
│                                                                             │
│  1. Cole 10 URLs + selecione preset                                        │
│     └─ Clique "Processar tudo"                                             │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ POST /process (10 requisições)
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│ Servidor - Receber                                                          │
│                                                                             │
│ app.post("/process", (req, res) => {                                        │
│   1. Validar URL + preset                                                   │
│   2. Gerar ID único (nanoid)                                                │
│   3. Criar job { id, status: "PENDING", ... }                              │
│   4. Adicionar à PENDING_QUEUE                                              │
│   5. Chamar processQueue()                                                  │
│   6. Retornar { id } IMEDIATAMENTE                                          │
│ })                                                                          │
│                                                                             │
│ RESPOSTA (em <10ms!)                                                        │
│ ✓ cliente recebe ID                                                         │
│ ✓ page fica responsiva                                                      │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ processQueue() - Algoritmo de Fila
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│ Servidor - Processamento Paralelo                                           │
│                                                                             │
│ Cenário: 10 jobs na fila, máximo 10 simultâneos                            │
│                                                                             │
│ Tempo 0s:      Tempo 30s:      Tempo 60s:       Tempo 90s:                 │
│ ┌─────────┐    ┌─────────┐    ┌─────────┐     ┌─────────┐                │
│ │Job 1 ▓▓│    │Job 1 ✅ │    │Job 1 ✅ │     │Job 1 ✅ │                │
│ │Job 2 ▒▒│ -> │Job 2 ▓▓ │ -> │Job 2 ✅ │ ->  │Job 2 ✅ │                │
│ │Job 3 ▒░│    │Job 3 ▒▒ │    │Job 3 ▓▓ │     │Job 3 ✅ │                │
│ │...    │    │...    │    │...    │     │...    │                │
│ │Job 10░░│    │Job 10░░│    │Job 10░░ │     │Job 10░░ │                │
│ └─────────┘    └─────────┘    └─────────┘     └─────────┘                │
│ ▓ = Processando, ░ = Awaiting, ✅ = Done                                   │
│                                                                             │
│ ACTIVE_JOBS = 10                                                            │
│ Queue: [job1, job2, ..., job10]                                             │
│                                                                             │
│ → processQueue() começa a processar job1-10                                 │
│ → ACTIVE_JOBS = 10 (máximo atingido)                                       │
│ → Job 1 termina em ~25s                                                     │
│ → ACTIVE_JOBS = 9                                                          │
│ → processQueue() processa job11 automaticamente                              │
│ → Ciclo continua...                                                         │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ processJob(id) - Processamento
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│ Servidor - Processador Individual                                           │
│                                                                             │
│ async processJob(id) {                                                      │
│                                                                             │
│   1. job.status = "EXTRACTING"                                              │
│      └─ getYouTubeMetadata(url) → yt-dlp -j                                │
│         └─ Extrai: título, duração, thumbnail, videoId                     │
│         └─ job.progress = 10%                                              │
│                                                                             │
│   2. job.status = "PROCESSING"                                              │
│      └─ getAudioStream(url) → yt-dlp audio (stdout)                        │
│         ▼                                                                    │
│      └─ Pipe para FFmpeg (stdin)                                            │
│         ├─ Aplicar filtro de áudio (SLOWED, NIGHTCORE, etc)               │
│         ├─ Encode para MP3 192k                                             │
│         └─ Salvar em /storage/out/                                          │
│      └─ job.progress = 15% → 95% (conforme FFmpeg processa)                │
│                                                                             │
│   3. if (sucesso)                                                           │
│      └─ job.status = "DONE"                                                │
│         job.progress = 100%                                                │
│         job.filename = "titulo_preset.mp3"                                 │
│                                                                             │
│   4. if (erro)                                                              │
│      └─ job.status = "ERROR"                                               │
│         job.error = "mensagem de erro"                                     │
│                                                                             │
│ }                                                                           │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ Cliente - Polling
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│ Cliente - Monitor                                                           │
│                                                                             │
│ setInterval(() => {                                                         │
│   for (each job) {                                                          │
│     GET /status/:id                                                         │
│     ├─ Atualizar job.status                                                │
│     ├─ Atualizar job.progress (barra)                                      │
│     ├─ Atualizar job.title                                                 │
│     └─ Renderizar card                                                     │
│   }                                                                         │
│   updateStats()  // Total, Processando, Done, Erro                         │
│ }, 500)  // A cada 500ms                                                   │
│                                                                             │
│ UI Atualiza em Tempo Real                                                   │
│ ✓ Barras de progresso se movem                                             │
│ ✓ Status muda de cor                                                       │
│ ✓ Botão de download aparece quando DONE                                    │
│                                                                             │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  │ Cliente - Download
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│ Cliente - Finalização                                                       │
│                                                                             │
│ Quando job.status == "DONE":                                                │
│   1. Botão "⬇️ Download" aparece                                            │
│   2. Clique em Download                                                     │
│   3. GET /file/:id                                                          │
│      └─ Servidor envia arquivo MP3                                          │
│      └─ Browser faz download                                               │
│                                                                             │
│ Arquivo salvo como: titulo_preset.mp3                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                       ESTATÍSTICAS EM TEMPO REAL                             ║
╚══════════════════════════════════════════════════════════════════════════════╝

GET /queue-stats
│
└─ Retorna:
   {
     "total": 10,              // Total de jobs criados
     "pending": 2,             // Na fila esperando
     "processing": 5,          // Processando agora
     "done": 2,                // Prontos para download
     "error": 1,               // Falharam
     "activeJobs": 5,          // Jobs ativos agora
     "maxConcurrent": 10,      // Limite de simultâneos
     "queueLength": 2          // Tamanho da fila PENDING
   }


╔══════════════════════════════════════════════════════════════════════════════╗
║                         COMPARATIVO: ANTES vs DEPOIS                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

                    ANTES (formulário único)
                    ↓
    Cliente: Cola 1 URL
    POST /process
    ├─ Servidor aguarda 30s (processamento)
    ├─ Browser TRAVADO
    └─ Resposta: arquivo MP3
    Resultado: 1 músic processa por vez


                    DEPOIS (processamento em massa)
                    ↓
    Cliente: Cola 10 URLs
    POST /process (retorna <10ms)
    ├─ Servidor: Cria 10 jobs
    ├─ Browser: RESPONSIVO
    ├─ Polling: Atualiza a cada 500ms
    ├─ Paralelo: 10 jobs processam
    └─ Resultado: 10 músicas em paralelo
    Tempo total: ~30-40s (vs 300s sequencial)


╔══════════════════════════════════════════════════════════════════════════════╗
║                          ARQUIVOS CRIADOS/MODIFICADOS                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

CRIADOS:
  ✓ public/batch.html       - Interface do formulário
  ✓ public/batch.js         - Lógica de fila no cliente
  ✓ BATCH_PROCESSING.md     - Documentação detalhada
  ✓ BATCH_FAQ.md            - Perguntas frequentes
  ✓ BATCH_SUMMARY.md        - Resumo das alterações
  ✓ BATCH_ARCHITECTURE.md   - Este arquivo

MODIFICADOS:
  ✓ server.js               - Adicionado gerenciador de fila
  ✓ public/index.html       - Link para batch.html

TAMANHOS APROXIMADOS:
  ✓ batch.html:     ~8KB
  ✓ batch.js:       ~10KB
  ✓ server.js:      +400 linhas (refatorado)
  ✓ Documentação:   ~50KB
```
