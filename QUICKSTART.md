# 🚀 Quick Start - R2 Integration

## ⚡ Configuração Rápida (5 minutos)

### 1️⃣ Configure o arquivo .env

```bash
# Edite o arquivo .env e adicione suas credenciais R2:
nano .env
```

Adicione estas linhas:

```env
R2_ACCESS_KEY_ID=seu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
R2_ENDPOINT=https://seu-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=seu-bucket-name
```

💡 **Onde conseguir as credenciais?**
1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Vá em **R2** > **Overview**
3. Crie um bucket (se não tiver)
4. Vá em **Manage R2 API Tokens**
5. Crie um token com permissões de Read & Write
6. Copie as credenciais

---

### 2️⃣ Inicie o servidor

```bash
npm start
# ou
node server.js
```

---

### 3️⃣ Teste a integração

```bash
# Rode o script de teste automatizado
./test-r2.sh
```

Se tudo estiver correto, você verá:

```
✓ Upload inicial: OK
✓ Listagem: 1 arquivo(s)
✓ Segundo upload: OK
✓ Listagem final: 2 arquivo(s)
✓ Testes concluídos!
```

---

## 🎯 Endpoints Disponíveis

### Para Testes

```bash
# Upload de teste
curl -X POST http://localhost:3000/api/r2-test/upload-test \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-123", "preset": "NIGHTCORE"}'

# Listar arquivos
curl http://localhost:3000/api/r2-test/recent-free?userId=test-123

# Limpar expirados
curl -X POST http://localhost:3000/api/r2-test/cleanup \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-123"}'
```

### Para Produção (Usuários Free)

```bash
# Processar áudio
curl -X POST http://localhost:3000/api/free/process \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "preset": "NIGHTCORE"
  }'

# Listar processamentos recentes
curl http://localhost:3000/api/free/recent

# Limpar arquivos expirados
curl -X POST http://localhost:3000/api/free/cleanup \
  -H "Content-Type: application/json"
```

---

## 📝 Presets Disponíveis

- `SLOWED` - Slowdown 0.88x com preservação de pitch
- `SPEED_125` - Speed up 1.25x com preservação de pitch
- `ULTRA_SLOWED` - Drone etéreo (0.12x) com reverb
- `MUFFLED_SLOWED` - Abafado + lento (lowpass 300Hz)
- `MUFFLED_SPEED` - Abafado + rápido (lowpass 600Hz)
- `DAYCORE` - Tempo 80% + pitch down
- `NIGHTCORE` - Tempo 135% + pitch up
- `8D` - Audio 8D (implementar se necessário)

---

## 📂 Arquivos Criados

### Novos arquivos da integração:

```
storage/
  └── r2.js                           # ⭐ Módulo principal R2

src/
  ├── controllers/
  │   └── FreeUserController.js       # ⭐ Controller para users free
  ├── routes/
  │   ├── r2Test.js                   # ⭐ Rotas de teste
  │   └── free.js                     # ⭐ Rotas de produção
  └── services/
      └── AudioProcessingService.js   # ✏️ Atualizado com processAndUploadToR2()

public/js/
  └── r2-integration-example.js       # 📘 Exemplos para frontend

test-r2.sh                            # 🧪 Script de testes
cleanup-r2.sh                         # 🧹 Script de limpeza
cron-setup.conf                       # ⏰ Configuração de cron jobs

R2_INTEGRATION.md                     # 📖 Documentação completa
QUICKSTART.md                         # ⚡ Este arquivo
.env.example                          # 🔐 Template de variáveis
```

---

## ⚠️ Importante

### ✅ O que mudou:

1. **Arquivos de áudio NÃO são mais salvos permanentemente no servidor**
2. **Tudo vai para o R2** após processamento
3. **Arquivos temporários em `/tmp`** são deletados automaticamente
4. **Usuários free: 1 hora de retenção**
5. **URLs públicas** retornadas para download

### ❌ O que NÃO fazer:

- ❌ Salvar arquivos em `storage/out/` (obsoleto para R2)
- ❌ Manter arquivos locais após upload
- ❌ Assumir que arquivos ficarão disponíveis após 1h (users free)
- ❌ Usar a API antiga de processamento (usar `/api/free/process`)

---

## 🔧 Configuração de Limpeza Automática

### Adicionar cron job:

```bash
# Edite o crontab
crontab -e

# Adicione esta linha (limpeza a cada 30 minutos)
*/30 * * * * /caminho/completo/para/AudioFlow/cleanup-r2.sh >> /var/log/phona-r2.log 2>&1
```

---

## 🐛 Troubleshooting

### Erro: "InvalidAccessKeyId"
- ✅ Verifique `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY` no `.env`

### Erro: "Não foi possível extrair Account ID"
- ✅ Verifique se `R2_ENDPOINT` está no formato: `https://ACCOUNT_ID.r2.cloudflarestorage.com`

### Arquivos não aparecem na listagem
- ✅ Verifique se já expiraram (mais de 1h)
- ✅ Confirme o `userId` correto

### Upload lento
- ✅ R2 free tier tem limites de bandwidth
- ✅ Considere upgrade para melhor performance

---

## 📚 Próximos Passos

1. ✅ Configure as credenciais R2
2. ✅ Rode os testes
3. 📖 Leia a [documentação completa](./R2_INTEGRATION.md)
4. 🎨 Integre com o frontend usando [exemplos JS](./public/js/r2-integration-example.js)
5. ⏰ Configure cron job para limpeza automática
6. 🚀 Deploy em produção

---

## 💡 Dicas

### Para desenvolvimento:
```bash
# Acompanhe os logs do servidor
npm start

# Em outro terminal, rode testes
./test-r2.sh
```

### Para produção:
```bash
# Use PM2 para gerenciar o processo
pm2 start server.js --name phona-audioflow

# Configure o cron job
crontab -e
# Adicione: */30 * * * * /path/to/cleanup-r2.sh
```

---

## 🆘 Precisa de Ajuda?

- 📖 [Documentação Completa](./R2_INTEGRATION.md)
- 🧪 [Script de Testes](./test-r2.sh)
- 📘 [Exemplos Frontend](./public/js/r2-integration-example.js)
- 🔧 [Configuração Cron](./cron-setup.conf)

---

**✅ Pronto para usar!** 🎉

Se os testes passaram, sua integração R2 está funcionando perfeitamente.
