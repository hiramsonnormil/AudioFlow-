# 🚀 AudioFlow - Deploy Quick Start

## Arquivos Criados para Deploy

### 📁 Arquivos de Configuração

1. **`vercel.json`** - Configuração do Vercel para o frontend
2. **`.env.example`** - Template das variáveis de ambiente
3. **`ecosystem.config.js`** - Configuração do PM2 para gerenciar o Node.js
4. **`nginx.conf`** - Configuração do Nginx como reverse proxy
5. **`DEPLOY.md`** - Documentação completa de deploy
6. **`deploy.sh`** - Script automatizado de deploy
7. **`setup-ssl.sh`** - Script para configurar SSL
8. **`healthcheck.sh`** - Script para verificar saúde da aplicação

## ⚡ Deploy Rápido

### Frontend (Vercel)

```bash
# 1. Edite vercel.json e substitua a URL do backend
# 2. Faça push para o GitHub
git add .
git commit -m "Configuração de deploy"
git push origin main

# 3. Importe no Vercel (https://vercel.com)
# - Connect GitHub repository
# - Deploy!
```

### Backend (Digital Ocean)

```bash
# 1. Crie um Droplet Ubuntu 22.04 no Digital Ocean

# 2. Edite deploy.sh
nano deploy.sh
# Altere: SERVER_IP="seu-ip-aqui"

# 3. Execute o deploy
./deploy.sh

# 4. Configure variáveis de ambiente no servidor
ssh root@seu-ip
cd /var/www/audioflow
cp .env.example .env
nano .env
# Preencha todas as credenciais

# 5. Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/audioflow
sudo nano /etc/nginx/sites-available/audioflow
# Altere: your-domain.com para seu domínio
sudo ln -s /etc/nginx/sites-available/audioflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 6. Configure SSL
./setup-ssl.sh

# 7. Inicie a aplicação
pm2 start ecosystem.config.js
pm2 save

# 8. Verifique se está funcionando
./healthcheck.sh
```

## 📋 Checklist

### Antes do Deploy

- [ ] Criar conta no Digital Ocean
- [ ] Criar conta no Vercel
- [ ] Criar conta no MongoDB Atlas
- [ ] Configurar Cloudflare R2
- [ ] Obter credenciais Google OAuth
- [ ] Obter credenciais PushinPay

### Deploy Backend

- [ ] Criar Droplet
- [ ] Executar deploy.sh
- [ ] Configurar .env
- [ ] Configurar Nginx
- [ ] Configurar SSL
- [ ] Iniciar PM2

### Deploy Frontend

- [ ] Editar vercel.json
- [ ] Push para GitHub
- [ ] Importar no Vercel
- [ ] Configurar domínio (opcional)

### Pós Deploy

- [ ] Testar login
- [ ] Testar upload
- [ ] Testar processamento
- [ ] Testar pagamento
- [ ] Configurar monitoramento

## 🔗 URLs Importantes

- **Documentação completa:** `DEPLOY.md`
- **Frontend:** https://seu-app.vercel.app
- **Backend:** https://api.seu-dominio.com
- **MongoDB:** https://cloud.mongodb.com
- **Vercel:** https://vercel.com/dashboard
- **Digital Ocean:** https://cloud.digitalocean.com

## 🆘 Comandos Úteis

```bash
# Ver logs
pm2 logs audioflow

# Reiniciar
pm2 restart audioflow

# Status
pm2 status

# Health check
./healthcheck.sh

# Ver logs Nginx
sudo tail -f /var/log/nginx/audioflow-error.log
```

## 📚 Próximos Passos

Leia `DEPLOY.md` para instruções detalhadas de cada passo!
