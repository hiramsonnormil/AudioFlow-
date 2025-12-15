# 🚀 Guia de Deploy - AudioFlow

Este guia detalha o processo completo de deploy da aplicação AudioFlow, com frontend no Vercel e backend no Digital Ocean.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Deploy do Backend (Digital Ocean)](#deploy-do-backend-digital-ocean)
3. [Deploy do Frontend (Vercel)](#deploy-do-frontend-vercel)
4. [Configuração de Domínios e SSL](#configuração-de-domínios-e-ssl)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Monitoramento e Manutenção](#monitoramento-e-manutenção)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Pré-requisitos

### Contas Necessárias
- [ ] Conta no [Digital Ocean](https://www.digitalocean.com/)
- [ ] Conta no [Vercel](https://vercel.com/)
- [ ] Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [ ] Conta no [Cloudflare R2](https://www.cloudflare.com/products/r2/)
- [ ] Conta no Google Cloud Console (para OAuth)
- [ ] Conta no PushinPay (para pagamentos PIX)

### Ferramentas Locais
- Git instalado
- Node.js 18+ instalado
- SSH configurado
- Acesso ao repositório GitHub

---

## 🖥️ Deploy do Backend (Digital Ocean)

### Passo 1: Criar Droplet no Digital Ocean

1. Acesse o [Digital Ocean Dashboard](https://cloud.digitalocean.com/)
2. Crie um novo Droplet:
   - **Distribuição:** Ubuntu 22.04 LTS
   - **Plano:** Basic ($12/mês ou superior recomendado)
   - **CPU:** 2 GB RAM / 1 vCPU (mínimo)
   - **Região:** Escolha mais próxima dos usuários (ex: NYC, SFO, Toronto)
   - **SSH:** Adicione sua chave SSH pública

3. Anote o IP do servidor criado

### Passo 2: Configurar Acesso SSH

```bash
# Testar conexão
ssh root@seu-ip-do-servidor

# (Opcional) Criar usuário não-root
adduser audioflow
usermod -aG sudo audioflow
```

### Passo 3: Executar Script de Deploy Automatizado

No seu computador local:

```bash
# 1. Editar o script de deploy
nano deploy.sh

# Altere estas variáveis:
SERVER_IP="seu-ip-do-servidor"
SERVER_USER="root"  # ou "audioflow" se criou usuário
BRANCH="main"  # ou sua branch principal

# 2. Executar o deploy
./deploy.sh
```

O script irá:
- Instalar Node.js, PM2, Nginx, ffmpeg, yt-dlp
- Clonar o repositório
- Instalar dependências
- Configurar PM2
- Configurar firewall

### Passo 4: Configurar Variáveis de Ambiente

```bash
# Conectar ao servidor
ssh root@seu-ip-do-servidor

# Editar arquivo .env
cd /var/www/audioflow
nano .env
```

Copie o conteúdo de `.env.example` e preencha com seus valores:

```env
NODE_ENV=production
PORT=8080

# MongoDB (use MongoDB Atlas)
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/audioflow?retryWrites=true&w=majority

# JWT
JWT_SECRET=sua-chave-super-secreta-aleatoria-aqui

# Google OAuth
GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=seu-client-secret
GOOGLE_CALLBACK_URL=https://api.seu-dominio.com/api/auth/google/callback

# CORS - adicione o domínio do Vercel
CORS_ALLOWED_ORIGINS=https://seu-app.vercel.app,https://seu-dominio.com
COOKIE_SECURE=true
COOKIE_SAMESITE=none

# Cloudflare R2
R2_ACCOUNT_ID=seu-account-id
R2_ACCESS_KEY_ID=sua-access-key
R2_SECRET_ACCESS_KEY=sua-secret-key
R2_BUCKET_NAME=seu-bucket
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev

# PushinPay
PUSHINPAY_CLIENT_ID=seu-client-id
PUSHINPAY_CLIENT_SECRET=seu-client-secret
WEBHOOK_BASE_URL=https://api.seu-dominio.com
```

### Passo 5: Configurar Nginx

```bash
# Copiar configuração do Nginx
sudo cp /var/www/audioflow/nginx.conf /etc/nginx/sites-available/audioflow

# Editar e ajustar domínios
sudo nano /etc/nginx/sites-available/audioflow

# Ativar site
sudo ln -s /etc/nginx/sites-available/audioflow /etc/nginx/sites-enabled/

# Remover configuração padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Passo 6: Configurar SSL com Certbot

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d api.seu-dominio.com

# Renovação automática já está configurada
```

### Passo 7: Iniciar Aplicação

```bash
cd /var/www/audioflow

# Iniciar com PM2
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs audioflow

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
sudo pm2 startup
```

---

## 🌐 Deploy do Frontend (Vercel)

### Passo 1: Preparar Repositório

O arquivo `vercel.json` já está configurado na raiz do projeto.

**Edite `vercel.json` antes do deploy:**

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://api.seu-dominio.com/api/:path*"
    }
  ]
}
```

Substitua `https://api.seu-dominio.com` pela URL do seu backend.

### Passo 2: Deploy no Vercel

**Opção A: Via Interface Web**

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Importe seu repositório do GitHub
4. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** ./
   - **Build Command:** `echo "Static"`
   - **Output Directory:** `public`

5. Clique em "Deploy"

**Opção B: Via CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Passo 3: Configurar Variáveis de Ambiente no Vercel

No painel do Vercel:
1. Vá em Settings > Environment Variables
2. Adicione:
   ```
   NEXT_PUBLIC_API_URL=https://api.seu-dominio.com
   ```

### Passo 4: Configurar Domínio Customizado (Opcional)

1. No Vercel, vá em Settings > Domains
2. Adicione seu domínio customizado
3. Configure DNS conforme instruções do Vercel

---

## 🌍 Configuração de Domínios e SSL

### Backend (Digital Ocean)

1. Adicione um registro A no seu DNS apontando para o IP do servidor:
   ```
   api.seu-dominio.com  →  IP-DO-SERVIDOR
   ```

2. SSL já foi configurado pelo Certbot

### Frontend (Vercel)

1. Vercel fornece SSL automaticamente
2. Se usar domínio customizado, adicione registro:
   ```
   seu-dominio.com  →  cname.vercel-dns.com
   ```

---

## ⚙️ Variáveis de Ambiente

### Obter Credenciais

#### MongoDB Atlas
1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster gratuito
3. Database Access > Add New Database User
4. Network Access > Add IP Address (0.0.0.0/0 para permitir de qualquer lugar)
5. Clusters > Connect > Connect your application
6. Copie a connection string

#### Google OAuth
1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto
3. APIs & Services > Credentials
4. Create Credentials > OAuth 2.0 Client ID
5. Adicione URIs autorizados:
   - `https://api.seu-dominio.com/api/auth/google/callback`
   - `http://localhost:8080/api/auth/google/callback` (dev)

#### Cloudflare R2
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. R2 > Create bucket
3. Manage R2 API Tokens > Create API Token
4. Copie Account ID, Access Key e Secret Key

#### PushinPay
1. Acesse [PushinPay Dashboard](https://pushinpay.com.br/)
2. Configurações > API
3. Copie Client ID e Client Secret
4. Configure webhook URL: `https://api.seu-dominio.com/api/webhooks/pushinpay`

---

## 📊 Monitoramento e Manutenção

### Comandos Úteis PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs audioflow

# Ver logs de erro
pm2 logs audioflow --err

# Reiniciar aplicação
pm2 restart audioflow

# Parar aplicação
pm2 stop audioflow

# Monitoramento
pm2 monit

# Informações detalhadas
pm2 show audioflow
```

### Monitorar Nginx

```bash
# Ver logs de acesso
sudo tail -f /var/log/nginx/audioflow-access.log

# Ver logs de erro
sudo tail -f /var/log/nginx/audioflow-error.log

# Verificar status
sudo systemctl status nginx
```

### Atualizar Aplicação

```bash
# Conectar ao servidor
ssh root@seu-ip-do-servidor

# Ir para diretório
cd /var/www/audioflow

# Pull das mudanças
git pull origin main

# Instalar novas dependências
npm install --production

# Reiniciar PM2
pm2 restart audioflow
```

### Backup do Banco de Dados

```bash
# Backup MongoDB
mongodump --uri="sua-connection-string" --out=/backup/$(date +%Y%m%d)

# Restaurar
mongorestore --uri="sua-connection-string" /backup/20231215
```

---

## 🔧 Troubleshooting

### Backend não responde

```bash
# Verificar se está rodando
pm2 status

# Ver logs
pm2 logs audioflow --lines 100

# Verificar porta
sudo netstat -tulpn | grep 8080

# Verificar Nginx
sudo nginx -t
sudo systemctl status nginx
```

### CORS Errors

1. Verifique `.env`:
   ```env
   CORS_ALLOWED_ORIGINS=https://seu-app.vercel.app
   COOKIE_SECURE=true
   COOKIE_SAMESITE=none
   ```

2. Verifique `nginx.conf` tem headers CORS corretos

3. Reinicie:
   ```bash
   pm2 restart audioflow
   sudo systemctl restart nginx
   ```

### Erro de Autenticação Google

1. Verifique callback URL no Google Cloud Console
2. Deve ser: `https://api.seu-dominio.com/api/auth/google/callback`
3. Verifique variáveis no `.env`

### Upload de arquivos falha

1. Verifique `client_max_body_size` no nginx.conf
2. Verifique espaço em disco: `df -h`
3. Verifique permissões: `ls -la storage/`

### MongoDB Connection Failed

1. Verifique Network Access no MongoDB Atlas
2. Teste conexão:
   ```bash
   mongosh "sua-connection-string"
   ```

---

## 📝 Checklist Final

### Backend
- [ ] Servidor criado no Digital Ocean
- [ ] SSH configurado
- [ ] Deploy script executado com sucesso
- [ ] Arquivo `.env` configurado
- [ ] Nginx configurado e rodando
- [ ] SSL configurado com Certbot
- [ ] PM2 rodando aplicação
- [ ] Firewall configurado
- [ ] MongoDB conectado
- [ ] Google OAuth funcionando
- [ ] Cloudflare R2 funcionando

### Frontend
- [ ] `vercel.json` configurado com URL do backend
- [ ] Deploy no Vercel concluído
- [ ] Domínio customizado configurado (opcional)
- [ ] Comunicação com backend funcionando
- [ ] CORS configurado corretamente

### Testes
- [ ] Acessar frontend e fazer login
- [ ] Testar upload de áudio
- [ ] Testar processamento
- [ ] Testar download
- [ ] Testar pagamento PIX
- [ ] Verificar logs sem erros

---

## 🆘 Suporte

Em caso de dúvidas ou problemas:

1. Verificar logs: `pm2 logs audioflow`
2. Verificar Nginx: `sudo tail -f /var/log/nginx/audioflow-error.log`
3. Verificar conectividade: `curl http://localhost:8080/health`
4. Consultar documentação das ferramentas utilizadas

---

## 🔄 Updates Futuros

Para fazer updates da aplicação:

```bash
# Local
git add .
git commit -m "Nova feature"
git push origin main

# Servidor
ssh root@seu-ip
cd /var/www/audioflow
git pull origin main
npm install --production
pm2 restart audioflow
```

---

**Bom deploy! 🚀**
