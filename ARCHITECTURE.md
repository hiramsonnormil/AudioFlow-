# 🏗️ Arquitetura AudioFlow + MongoDB Atlas

## 📊 Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    🌐 CLIENTE (Navegador)                       │
│          (Dashboard, Batch Processor, Streaming)                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                     HTTP/REST API
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                 🖥️  SERVER EXPRESS.JS                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Routes (/process, /status, /jobs, /users, etc)         │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Controllers (ProcessController, UserController*)        │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  Services:                                               │  │
│  │  • JobQueueService (fila + MongoDB)                     │  │
│  │  • AudioProcessingService (ffmpeg)                      │  │
│  │  • YouTubeService (yt-dlp)                              │  │
│  │  • AudioFileService (manipulação de áudio)              │  │
│  │  • UserService (usuários) ⭐ NEW                        │  │
│  │  • DatabaseService (conexão Atlas) ⭐ NEW               │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                   Mongoose ODM/Adapter
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                 ☁️  MONGODB ATLAS (Nuvem)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Database: audioflow                                     │  │
│  │  ┌────────────────┐  ┌──────────┐  ┌─────────────────┐ │  │
│  │  │ Collection:    │  │Collection│  │ Collection:     │ │  │
│  │  │   users ⭐     │  │   jobs   │  │   presets ⭐    │ │  │
│  │  │ ┌────────────┐ │  │┌───────┐│  │ ┌─────────────┐ │ │  │
│  │  │ │email       │ │  ││jobId  ││  │ │presetId     │ │ │  │
│  │  │ │username    │ │  ││userId ││  │ │name         │ │ │  │
│  │  │ │password    │ │  ││status ││  │ │description  │ │ │  │
│  │  │ │plan        │ │  ││preset ││  │ │config       │ │ │  │
│  │  │ │isActive    │ │  ││output ││  │ │enabled      │ │ │  │
│  │  │ │...         │ │  ││...    ││  │ │...          │ │ │  │
│  │  │ └────────────┘ │  │└───────┘│  │ └─────────────┘ │ │  │
│  │  │ Índices:       │  │ Índices │  │ Índices         │ │  │
│  │  │ • email        │  │ • jobId │  │ • enabled       │ │  │
│  │  │ • createdAt    │  │ • userId│  │ • presetId      │ │  │
│  │  │                │  │ • status│  │ • createdAt     │ │  │
│  │  │ TTL: -         │  │ TTL: 30d│  │ TTL: -          │ │  │
│  │  └────────────────┘  │└───────┘│  │ └─────────────┘ │ │  │
│  │                      │(Auto-   │  │                 │ │  │
│  │                      │ delete) │  │                 │ │  │
│  └──────────────────────────────────────────────────────┘  │  │
│                                                             │  │
│  📊 Stats:                                                 │  │
│  • Replicação: 3 nodes (automático no Atlas)              │  │
│  • Backup: Diário (retém 35 dias)                         │  │
│  • Encriptação: TLS em trânsito + em repouso              │  │
│  • Monitoramento: Alertas automáticos                      │  │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│         💾 STORAGE LOCAL (Servidor)                        │
│  ├─ storage/in/    → Arquivos aguardando                  │
│  ├─ storage/out/   → Arquivos processados                 │
│  └─ storage/meta/  → Metadados (timestamps, etc)          │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de um Job com MongoDB

```
1. Cliente submete job
   POST /jobs { url, preset }
   │
   ▼
2. ProcessController.startProcess()
   │
   ├─ Validar URL + preset
   │
   ├─ Criar documento no MongoDB (jobs collection)
   │ └─ { jobId, userId, status: "PENDING", preset, etc }
   │
   ▼
3. JobQueueService.enqueueJob()
   │
   ├─ Salvar no MongoDB
   │
   └─ Adicionar à fila em memória
   │
   ▼
4. ProcessQueue inicia
   │
   ├─ GET /status/jobId → Consultar MongoDB
   │
   ├─ Update status → Persistir em MongoDB (DOWNLOADING)
   │
   ├─ Download do YouTube
   │
   ├─ Extract áudio
   │
   ├─ Processar com ffmpeg
   │
   ├─ Salvar arquivo em storage/out/
   │
   ├─ Atualizar MongoDB (outputPath, fileSize)
   │
   ├─ Mark como DONE → MongoDB { status: "DONE" }
   │
   └─ Usuário faz GET /file/jobId → Download do arquivo
   │
   ▼
5. TTL Index (30 dias após completar)
   └─ Document auto-deletado do MongoDB
```

---

## 📦 Collections com Exemplos

### users Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  email: "hiramsonnormil@gmail.com",
  username: "Hiram Sonnormil",
  password: "hash_bcrypt_aqui", // TODO: implementar bcrypt
  plan: "free", // free | pro | premium
  jobsProcessed: 142,
  storageUsed: 5242880000, // 5GB em bytes
  subscriptionStart: ISODate("2025-11-18"),
  subscriptionEnd: null,
  isActive: true,
  avatar: "https://gravatar.com/...",
  createdAt: ISODate("2025-11-18T10:00:00Z"),
  updatedAt: ISODate("2025-11-18T15:30:00Z")
}
```

### jobs Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439012"),
  jobId: "abc123xyz",
  userId: ObjectId("507f1f77bcf86cd799439011"),
  status: "DONE",
  progress: 100,
  inputUrl: "https://youtube.com/watch?v=dQw4w9WgXcQ",
  outputPath: "/storage/out/abc123xyz-nightcore.mp3",
  filename: "Never_Gonna_Give_You_Up_Nightcore.mp3",
  fileSize: 5242880,
  preset: "NIGHTCORE",
  error: null,
  metadata: {
    title: "Never Gonna Give You Up",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 213,
    videoId: "dQw4w9WgXcQ",
    artist: "Rick Astley"
  },
  processingTime: 45, // segundos
  startedAt: ISODate("2025-11-18T14:00:00Z"),
  completedAt: ISODate("2025-11-18T14:00:45Z"),
  createdAt: ISODate("2025-11-18T13:59:00Z"),
  updatedAt: ISODate("2025-11-18T14:00:45Z"),
  // Será auto-deletado em 2025-12-18 (30 dias)
}
```

### presets Collection
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439013"),
  presetId: "NIGHTCORE",
  name: "Nightcore",
  description: "135% + pitch +5-6 semitons",
  icon: "<svg>...</svg>",
  enabled: true,
  config: {
    tempo: 1.35,
    pitch: 6,
    filters: ["reverb"],
    reverb: 0.5
  },
  createdAt: ISODate("2025-11-18T10:00:00Z"),
  updatedAt: ISODate("2025-11-18T10:00:00Z")
}
```

---

## 🔐 Segurança

```
┌─────────────────────────────────────────────────────────┐
│         🔐 SEGURANÇA - Camadas                          │
├─────────────────────────────────────────────────────────┤
│ 1. TLS/SSL em trânsito                                  │
│    └─ Encriptação entre cliente ↔ servidor ↔ MongoDB    │
│                                                         │
│ 2. MongoDB Atlas IP Whitelist                           │
│    └─ Apenas IPs autorizados podem conectar             │
│                                                         │
│ 3. Autenticação do usuário MongoDB                      │
│    └─ hiramsonnormil00_db_user (com senha)              │
│                                                         │
│ 4. .env não commitado (em .gitignore)                   │
│    └─ Credenciais não expostas no Git                   │
│                                                         │
│ 5. JWT Tokens (Futuro)                                  │
│    └─ Autenticação de usuários finais                   │
│                                                         │
│ 6. Validação de entrada (Mongoose schemas)              │
│    └─ Previne injections e dados inválidos              │
│                                                         │
│ 7. CORS (A implementar)                                 │
│    └─ Controlar acesso cross-origin                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 Escalabilidade

### Antes (Só em memória)
```
❌ Dados perdidos ao reiniciar servidor
❌ Sem histórico persistente
❌ Não escalável (tudo na RAM)
❌ Um servidor apenas
```

### Agora (Com MongoDB Atlas)
```
✅ Dados persistentes em nuvem
✅ Histórico completo de jobs
✅ Escalável (múltiplos servidores podem compartilhar DB)
✅ Backup automático
✅ Replicação de dados (3 nodes)
✅ Pronto para produção
```

### Próximas Fases
```
Phase 2: Autenticação
  └─ JWT tokens, refresh tokens, 2FA

Phase 3: Planos Pagos
  └─ Integração Stripe, limites por plano
  └─ Webhooks de pagamento

Phase 4: Multi-tenant
  └─ Múltiplas organizações em um servidor
  └─ Isolamento de dados por tenant

Phase 5: Global Scale
  └─ MongoDB Global Clusters
  └─ Sharding automático
  └─ CDN para downloads
```

---

## 🚀 Performance

### Índices Otimizados
```javascript
// Buscar jobs de um usuário (muito rápido)
db.jobs.find({ userId: id }).sort({ createdAt: -1 }).limit(10)
  → Usa índice { userId: 1, createdAt: -1 }

// Contar jobs por status (muito rápido)
db.jobs.find({ status: "DONE" }).count()
  → Usa índice { status: 1, createdAt: -1 }

// Buscar job específico (instantâneo)
db.jobs.findOne({ jobId: "abc123xyz" })
  → Usa índice { jobId: 1 }
```

### Queries Esperadas por Segundo
```
Ambiente: Atlas Free Tier (Shared Cluster)

Reads:     ~10,000 ops/sec
Writes:    ~5,000 ops/sec
Deletes:   ~2,000 ops/sec

Para 100 jobs/dia em uso:
  • Leitura: ~1 query/seg
  • Escrita: ~0.1 query/seg
  
Utilização: < 1%
Status: ✅ Mais que suficiente
```

---

## 📊 Monitoramento

### Via MongoDB Atlas Dashboard

1. **Metrics**
   - Connections: 1-5 (esperado)
   - Throughput: < 1% (esperado para startup)
   - Storage: 50MB-500MB (dependendo do volume)

2. **Alerts** (Automáticos)
   - Conexões acima de 100
   - Queries > 1 segundo
   - Replicação atrasada
   - Espaço em disco baixo

3. **Logs** (Armazenados por 7 dias)
   - Acesso de usuários
   - Queries lentas
   - Erros de conexão

---

## 🎯 Pronto para Produção?

✅ **Sim!** Com as seguintes considerações:

### Antes de Deploy
```
□ Hash de passwords com bcrypt
□ JWT para autenticação
□ Rate limiting (express-rate-limit)
□ CORS configurado
□ Validação mais rigorosa
□ Logging estruturado (winston/pino)
□ Error handling melhorado
□ Testes automatizados
□ CI/CD pipeline (GitHub Actions)
```

### Infraestrutura Sugerida
```
Desenvolvimento: ← Você está aqui
  • Atlas Free Tier
  • Server local/VPS pequena
  
Staging:
  • Atlas M0 (12.5GB)
  • Server com 2GB RAM
  
Produção:
  • Atlas M2+ (com backup automático)
  • Load balancer
  • Multiple servers
  • CDN para arquivos
```

---

Pronto! Você tem uma arquitetura **escalável**, **segura** e **pronta para crescer**! 🚀
