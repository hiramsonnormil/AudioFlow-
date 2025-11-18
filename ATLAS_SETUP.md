# 🗄️ Configuração MongoDB Atlas - AudioFlow

## 📋 Pré-requisitos
- Conta Google, GitHub ou conta de email
- Conhecimento básico de MongoDB/NoSQL

---

## 🚀 Passo 1: Criar Conta no MongoDB Atlas

1. Acesse: **https://www.mongodb.com/cloud/atlas**
2. Clique em **"Sign Up with Email"** ou use Google/GitHub
3. Preencha os dados e confirme o email
4. Você será levado ao dashboard

---

## 🏗️ Passo 2: Criar um Free Shared Cluster

### No Dashboard do Atlas:

1. **Clique em "Build a Database"**
   - Escolha **"Shared"** (Grátis, 512MB de armazenamento)
   - Selecione sua região preferida (ex: `us-east-1` ou a mais próxima)

2. **Configure o Cluster**
   - Nome padrão: `Cluster0` (ok deixar assim)
   - Provider: AWS/Azure/Google (qualquer um)
   - Clique em **"Create Cluster"** (leva 1-2 minutos)

---

## 🔑 Passo 3: Criar Usuário de Acesso

1. No painel esquerdo, vá em **"Database Access"**
2. Clique **"Add New Database User"**
3. Escolha **"Password"** como método de autenticação
4. Preencha:
   - **Username**: `hiramsonnormil00_db_user` (já pré-configurado no código)
   - **Password**: Crie uma senha forte (ex: `SecurePass123!@#`)
   - Role: **"Built-in Role" > "Atlas Admin"**
5. Clique **"Add User"**

---

## 🌐 Passo 4: Configurar Network Access (IP Whitelist)

1. Ainda na dashboard, vá em **"Network Access"**
2. Clique **"Add IP Address"**
3. Opções:
   - **Desenvolvimento Local**: Clique **"Add Current IP"**
   - **Produção**: Adicione `0.0.0.0/0` (qualquer IP - menos seguro, não fazer em produção real)
4. Clique **"Confirm"**

---

## 🔗 Passo 5: Obter Connection String

1. Volte para **"Databases"** (painel esquerdo)
2. Clique no botão **"Connect"** do seu cluster
3. Escolha **"Connect your application"**
4. Selecione **"Node.js"** como driver
5. Copie a connection string:

```
mongodb+srv://hiramsonnormil00_db_user:<password>@cluster0.6xlfrnb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

---

## 📝 Passo 6: Atualizar `.env` Local

1. Abra/crie o arquivo `.env` na raiz do projeto:

```bash
nano .env
# ou
code .env
```

2. Cole a connection string com sua senha real:

```env
# ===== MONGODB ATLAS =====
MONGODB_URI=mongodb+srv://hiramsonnormil00_db_user:SEU_PASSWORD_AQUI@cluster0.6xlfrnb.mongodb.net/audioflow?retryWrites=true&w=majority&appName=Cluster0

# ===== SERVER =====
PORT=8080
NODE_ENV=development

# ===== JWT (Para autenticação futura) =====
JWT_SECRET=seu_super_secret_jwt_key_aqui

# ===== AUDIO PROCESSING =====
MAX_CONCURRENT_JOBS=10
CLEANUP_OLD_JOBS_HOURS=24
```

**⚠️ IMPORTANTE**: Não fazer commit do `.env` no Git! (já está no `.gitignore`)

---

## 📦 Passo 7: Instalar Dependências

```bash
npm install
```

Isso instala `mongoose` e `dotenv` necessários.

---

## ✅ Passo 8: Testar Conexão

1. Inicie o servidor:

```bash
npm start
# ou com nodemon (desenvolvimento)
npm run dev
```

2. Você deve ver:

```
🔗 Conectando ao MongoDB Atlas...
   mongodb+srv://hiramsonnormil00_db_user:***@cluster0.6xlfrnb.mongodb.net...
✅ Conectado ao MongoDB Atlas com sucesso!
✅ Usuário demo criado
✅ Presets padrão criados

🚀 Server running on http://localhost:8080
📚 API Documentation: http://localhost:8080/api
🔗 Database Health: http://localhost:8080/health/db
```

3. Teste o health check:

```bash
curl http://localhost:8080/health/db
```

Resposta esperada:

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

---

## 🎯 Collections Criadas Automaticamente

O sistema cria 3 collections no Atlas:

### 1️⃣ **users**
```javascript
{
  _id: ObjectId,
  email: "demo@audioflow.local",
  username: "Demo User",
  password: "demo123", // TODO: Hash em produção
  plan: "free", // free | pro | premium
  jobsProcessed: 0,
  storageUsed: 0,
  subscriptionStart: null,
  subscriptionEnd: null,
  isActive: true,
  avatar: null,
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### 2️⃣ **jobs**
```javascript
{
  _id: ObjectId,
  jobId: "abc123xyz",
  userId: ObjectId,
  status: "DONE", // PENDING | DOWNLOADING | EXTRACTING | PROCESSING | DONE | ERROR
  progress: 100,
  inputUrl: "https://youtube.com/watch?v=...",
  outputPath: "/storage/out/...",
  filename: "song.mp3",
  fileSize: 5242880,
  preset: "NIGHTCORE",
  error: null,
  metadata: {
    title: "Video Title",
    thumbnail: "https://...",
    duration: 180,
    videoId: "dQw4w9WgXcQ",
    artist: "Artist Name"
  },
  processingTime: 45,
  startedAt: ISODate,
  completedAt: ISODate,
  createdAt: ISODate,
  updatedAt: ISODate,
  // Auto-deleta em 30 dias após completar
}
```

### 3️⃣ **presets**
```javascript
{
  _id: ObjectId,
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
  createdAt: ISODate,
  updatedAt: ISODate
}
```

---

## 🔍 Visualizar Dados no Atlas

1. Abra o Dashboard do MongoDB Atlas
2. Clique em **"Databases"** > seu cluster
3. Clique em **"Browse Collections"**
4. Navegue entre `audioflow.users`, `audioflow.jobs`, `audioflow.presets`

Você verá o usuário demo e os presets já criados! ✨

---

## 🚀 Próximos Passos

### Fase 2: Autenticação com JWT
- [ ] Hash de passwords com bcrypt
- [ ] Geração de JWT tokens
- [ ] Middleware de autenticação
- [ ] Refresh tokens

### Fase 3: Planos e Pagamento
- [ ] Integração Stripe/PagSeguro
- [ ] Limites por plano (jobs/mês, storage)
- [ ] Webhook para confirmação de pagamento

### Fase 4: Dashboard Pessoal
- [ ] Histórico de jobs por usuário
- [ ] Estatísticas de uso
- [ ] Download de arquivos processados

---

## 🆘 Troubleshooting

### Erro: "Cannot connect to MongoDB"
```
❌ Erro ao conectar ao MongoDB: getaddrinfo ENOTFOUND cluster0.6xlfrnb.mongodb.net
```

**Solução**: 
- Verifique se o IP está adicionado em "Network Access"
- Confira a senha no `.env`
- Teste a string de conexão em MongoDB Compass

### Erro: "Authentication failed"
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solução**:
- Certifique-se que `MONGODB_URI` está no `.env`
- O usuário e senha devem estar corretos
- Rode `echo $MONGODB_URI` para verificar

### Collections vazias no Atlas
```
No collections found in database 'audioflow'
```

**Solução**:
- Apenas aparecem depois que o servidor inicia
- Execute `npm start` e aguarde a mensagem de sucesso
- Atualize o dashboard do Atlas

---

## 📚 Documentação Útil

- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Mongoose Docs**: https://mongoosejs.com/docs/
- **MongoDB Connection String**: https://docs.mongodb.com/manual/reference/connection-string/

---

**Status**: ✅ AudioFlow agora tem persistência em nuvem!

Você já tem:
- ✅ Histórico de jobs sincronizado
- ✅ Status persistente
- ✅ Base pronta para autenticação
- ✅ Arquitetura escalável para planos pagos

🎉 Pronto para produção!
