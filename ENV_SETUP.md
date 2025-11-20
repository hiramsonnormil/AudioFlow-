# ⚙️ Configuração Final - Adicione ao seu .env

## 📝 Instruções

Adicione estas linhas ao final do seu arquivo `.env`:

```env
# ========================================
# Cloudflare R2 Configuration
# ========================================
# Obtenha suas credenciais em: https://dash.cloudflare.com/r2

R2_ACCESS_KEY_ID=seu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
R2_ENDPOINT=https://seu-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=seu-bucket-name
```

---

## 🔐 Como Obter as Credenciais

### Passo 1: Acesse o Cloudflare Dashboard
1. Vá para: https://dash.cloudflare.com
2. Faça login na sua conta
3. No menu lateral, clique em **R2**

### Passo 2: Crie um Bucket (se não tiver)
1. Clique em **Create bucket**
2. Escolha um nome (ex: `phona-audio`)
3. Selecione a região (recomendado: `Automatic`)
4. Clique em **Create bucket**

### Passo 3: Gere API Token
1. No menu R2, clique em **Manage R2 API Tokens**
2. Clique em **Create API Token**
3. Configure:
   - **Token Name**: `Phona AudioFlow`
   - **Permissions**: `Object Read & Write`
   - **Buckets**: Selecione o bucket criado (ou `All buckets`)
4. Clique em **Create API Token**

### Passo 4: Copie as Credenciais
Você receberá 4 informações importantes:

```
Access Key ID: 1234567890abcdef
Secret Access Key: abcdef1234567890abcdef1234567890
Endpoint for S3 Clients: https://1234567890abcdef.r2.cloudflarestorage.com
```

⚠️ **IMPORTANTE**: Copie o `Secret Access Key` imediatamente! Ele só é mostrado uma vez.

### Passo 5: Atualize o .env
Substitua os valores de exemplo pelos seus valores reais:

```env
R2_ACCESS_KEY_ID=1234567890abcdef
R2_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890
R2_ENDPOINT=https://1234567890abcdef.r2.cloudflarestorage.com
R2_BUCKET_NAME=phona-audio
```

---

## ✅ Verificação

Depois de configurar, teste se está funcionando:

```bash
# Teste 1: Verificar se as variáveis foram carregadas
node -e "require('dotenv').config(); console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT);"

# Teste 2: Rodar o script de teste completo
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

## 🔒 Segurança

### ✅ Boas Práticas:

1. **Nunca commite o .env**
   ```bash
   # Verifique se está no .gitignore
   cat .gitignore | grep .env
   ```

2. **Use permissões mínimas no token**
   - Apenas `Object Read & Write`
   - Apenas no bucket necessário

3. **Rotacione os tokens regularmente**
   - Recomendado: a cada 90 dias
   - Em caso de vazamento: delete imediatamente no dashboard

4. **Use variáveis de ambiente no CI/CD**
   - GitHub Actions: Secrets
   - GitLab CI: Variables
   - Heroku: Config Vars

---

## 🚨 Troubleshooting

### Erro: "Access Denied"
```
Causa: Token sem permissões corretas
Solução: Crie novo token com "Object Read & Write"
```

### Erro: "Bucket does not exist"
```
Causa: Nome do bucket incorreto ou não criado
Solução: Verifique o nome exato no dashboard R2
```

### Erro: "InvalidAccessKeyId"
```
Causa: Access Key ID incorreto
Solução: Copie novamente do dashboard
```

### Erro: "SignatureDoesNotMatch"
```
Causa: Secret Access Key incorreto ou com espaços extras
Solução: Certifique-se de copiar exatamente como mostrado
```

---

## 📊 Exemplo de .env Completo

Aqui está um exemplo de como seu `.env` deve ficar:

```env
# ========================================
# MongoDB Configuration
# ========================================
MONGO_URI=mongodb://localhost:27017/phona

# ========================================
# JWT Configuration
# ========================================
JWT_SECRET=sua_chave_secreta_super_segura

# ========================================
# Server Configuration
# ========================================
PORT=3000
NODE_ENV=development

# ========================================
# Cloudflare R2 Configuration
# ========================================
R2_ACCESS_KEY_ID=1234567890abcdef1234567890abcdef
R2_SECRET_ACCESS_KEY=abcdef1234567890abcdef1234567890abcdef1234567890
R2_ENDPOINT=https://1234567890abcdef.r2.cloudflarestorage.com
R2_BUCKET_NAME=phona-audio

# ========================================
# Optional: Development Settings
# ========================================
# LOG_LEVEL=debug
# UPLOAD_MAX_SIZE=10485760
```

---

## 🔄 Próximos Passos

Depois de configurar o `.env`:

1. ✅ Reinicie o servidor
   ```bash
   npm start
   ```

2. ✅ Rode os testes
   ```bash
   ./test-r2.sh
   ```

3. ✅ Faça um teste real de processamento
   ```bash
   curl -X POST http://localhost:3000/api/free/process \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
       "preset": "NIGHTCORE"
     }'
   ```

4. ✅ Configure o cron job (opcional)
   ```bash
   crontab -e
   # Adicione: */30 * * * * /path/to/cleanup-r2.sh
   ```

5. ✅ Leia a documentação completa
   ```bash
   cat R2_INTEGRATION.md
   ```

---

## 💡 Dicas

### Para Desenvolvimento Local:
```env
R2_BUCKET_NAME=phona-audio-dev
```

### Para Produção:
```env
R2_BUCKET_NAME=phona-audio-prod
NODE_ENV=production
```

### Para Staging:
```env
R2_BUCKET_NAME=phona-audio-staging
NODE_ENV=staging
```

---

## 📞 Precisa de Ajuda?

- 🐛 Problemas com R2: [Cloudflare Community](https://community.cloudflare.com/c/developers/r2-storage/62)
- 📖 Documentação completa: `R2_INTEGRATION.md`
- ⚡ Início rápido: `QUICKSTART.md`
- 📊 Sumário: `IMPLEMENTATION_SUMMARY.md`

---

**✅ Configuração Concluída!**

Quando suas credenciais estiverem configuradas, você estará pronto para usar o Phona AudioFlow com integração R2 completa! 🚀
