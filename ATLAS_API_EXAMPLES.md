# 📡 MongoDB Atlas - Exemplos de API

## 🔗 Health Check da Database

### Verificar Conexão com Atlas

```bash
curl http://localhost:8080/health/db
```

**Resposta (conectado)**:
```json
{
  "database": {
    "connected": true,
    "state": 1
  },
  "server": "running",
  "timestamp": "2025-11-18T10:30:00.000Z"
}
```

**Resposta (desconectado)**:
```json
{
  "database": {
    "connected": false,
    "state": 0
  },
  "server": "running",
  "timestamp": "2025-11-18T10:30:00.000Z"
}
```

---

## 📊 Queue Statistics (Agora com MongoDB)

### Obter Estatísticas da Fila

```bash
curl http://localhost:8080/queue-stats
```

**Resposta**:
```json
{
  "total": 42,
  "pending": 5,
  "processing": 2,
  "done": 30,
  "error": 5,
  "activeJobs": 2,
  "maxConcurrent": 10,
  "queueLength": 7,
  "statistics": {
    "totalProcessed": 40,
    "totalErrors": 5,
    "totalSuccess": 35
  }
}
```

---

## 💾 Visualizar Jobs no MongoDB Atlas

### Via MongoDB Compass (GUI)

1. Baixe: https://www.mongodb.com/products/compass
2. Abra Compass
3. Cole a connection string:
```
mongodb+srv://hiramsonnormil00_db_user:SEU_PASSWORD@cluster0.6xlfrnb.mongodb.net/
```
4. Clique em "Connect"
5. Navegue para: `audioflow > jobs`

### Via MongoDB CLI

```bash
# Conectar
mongosh "mongodb+srv://hiramsonnormil00_db_user:<password>@cluster0.6xlfrnb.mongodb.net/audioflow"

# Queries úteis
db.jobs.find().pretty()                    # Todos os jobs
db.jobs.find({ status: "DONE" }).count()   # Jobs completos
db.jobs.find({ status: "ERROR" }).pretty() # Jobs com erro
db.jobs.aggregate([
  { $group: { _id: "$preset", count: { $sum: 1 } } }
])                                          # Jobs por preset
```

---

## 🔐 User Management (Future API)

### Criar Novo Usuário

```bash
curl -X POST http://localhost:8080/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "username": "Novo Usuário",
    "password": "senha123"
  }'
```

**Resposta**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "email": "usuario@example.com",
  "username": "Novo Usuário",
  "plan": "free",
  "jobsProcessed": 0,
  "storageUsed": 0,
  "isActive": true,
  "createdAt": "2025-11-18T10:30:00.000Z"
}
```

---

## 📈 Histórico de Jobs por Usuário

### Obter Jobs do Usuário (Futuro)

```bash
curl http://localhost:8080/users/507f1f77bcf86cd799439011/jobs
```

**Resposta**:
```json
{
  "total": 15,
  "jobs": [
    {
      "id": "abc123xyz",
      "status": "DONE",
      "preset": "NIGHTCORE",
      "title": "Song Title",
      "filename": "song-nightcore.mp3",
      "progress": 100,
      "createdAt": "2025-11-18T09:00:00.000Z",
      "completedAt": "2025-11-18T09:02:30.000Z"
    }
  ]
}
```

---

## 🎯 Índices do MongoDB para Performance

Os índices já estão configurados nos schemas:

```javascript
// users
db.users.createIndex({ email: 1 })
db.users.createIndex({ createdAt: -1 })

// jobs
db.jobs.createIndex({ userId: 1, createdAt: -1 })  // Buscar jobs por usuário
db.jobs.createIndex({ status: 1, createdAt: -1 })  // Filtrar por status
db.jobs.createIndex({ jobId: 1 })                  // Buscar job específico

// presets
db.presets.createIndex({ enabled: 1 })             // Listar presets habilitados
```

Isso garante queries rápidas mesmo com milhões de jobs!

---

## 🧹 Limpeza Automática de Dados

### TTL Index (Time To Live)

Os jobs completados/com erro são **automaticamente deletados** após **30 dias**:

```javascript
// Configurado no schema Job.js
jobSchema.index(
  { completedAt: 1 },
  {
    expireAfterSeconds: 2592000, // 30 dias
    partialFilterExpression: { 
      status: { $in: ["DONE", "ERROR"] } 
    },
  }
);
```

Você pode ajustar isso em `src/models/schemas/Job.js` se precisar.

---

## 📊 Aggregation Queries Úteis

### Relatório: Jobs por Dia

```javascript
db.jobs.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      count: { $sum: 1 },
      avgTime: { $avg: "$processingTime" }
    }
  },
  { $sort: { _id: -1 } }
])
```

### Relatório: Presets Mais Usados

```javascript
db.jobs.aggregate([
  {
    $group: {
      _id: "$preset",
      total: { $sum: 1 },
      successful: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } },
      errors: { $sum: { $cond: [{ $eq: ["$status", "ERROR"] }, 1, 0] } }
    }
  },
  { $sort: { total: -1 } }
])
```

### Relatório: Armazenamento por Usuário

```javascript
db.jobs.aggregate([
  {
    $group: {
      _id: "$userId",
      totalSize: { $sum: "$fileSize" },
      jobCount: { $sum: 1 }
    }
  },
  { $sort: { totalSize: -1 } },
  { $limit: 10 }
])
```

---

## 🚀 Performance Tips

1. **Índices**: Todos os índices estão criados automaticamente
2. **Paginação**: Implemente `skip()` e `limit()` para grandes datasets
3. **Projeção**: Retorne apenas campos necessários com `select()`
4. **Cache**: Use Redis/Memcached para stats frequentes
5. **TTL**: Dados antigos são auto-deletados

---

## 🔄 Migração de Dados Locais para Atlas

Se você tinha dados em MongoDB local, migre assim:

```bash
# Fazer dump do MongoDB local
mongodump --uri "mongodb://localhost:27017/audioflow" -o ./dump

# Restaurar no Atlas
mongorestore --uri "mongodb+srv://hiramsonnormil00_db_user:PASSWORD@cluster0.6xlfrnb.mongodb.net/" ./dump/audioflow
```

---

## 📱 Status Atual do Sistema

✅ **Implementado**:
- [x] Conexão MongoDB Atlas
- [x] Schemas para Users, Jobs, Presets
- [x] JobQueueService com persistência
- [x] TTL para limpeza automática
- [x] Health check endpoint
- [x] Índices de performance

⏳ **Próximos**:
- [ ] UserService endpoints REST
- [ ] Autenticação JWT
- [ ] Planos pagos
- [ ] Dashboard com gráficos

---

## 🎓 Aprenda Mais

- **MongoDB Aggregation**: https://docs.mongodb.com/manual/aggregation/
- **Mongoose Performance**: https://mongoosejs.com/docs/api/query.html
- **Atlas Best Practices**: https://docs.atlas.mongodb.com/best-practices/

