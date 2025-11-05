# AudioFlow - API de Streaming de Áudio

Aplicação profissional de streaming de áudio com Node.js e Express.

## 🚀 Quick Start

### Instalação

```bash
npm install
```

### Configuração

1. Copie `.env.example` para `.env`
2. Preencha as variáveis de ambiente necessárias

```bash
cp .env.example .env
```

### Executar

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

Acesse em `http://localhost:8080`

---

## 📁 Estrutura do Projeto

```
.
├── public/                 # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── storage/               # Armazenamento local
│   ├── in/               # Arquivos de entrada
│   └── meta/             # Metadados
├── server.js             # Servidor principal
├── database-schema.sql   # Schema do banco
├── docker-compose.yml    # Docker setup
└── package.json          # Dependências
```

---

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Banco:** PostgreSQL
- **Segurança:** Helmet, JWT, bcrypt
- **Validação:** Joi
- **Frontend:** HTML5, CSS3, Vanilla JS

---

## 🔒 Segurança

- Autenticação via JWT
- Senhas com bcrypt
- CORS configurado
- Rate limiting incluído
- Helmet para headers HTTP

---

## 📚 Documentação

Consulte `INDEX.md` para documentação detalhada da API.

---

## 📦 Deployment

### Docker

```bash
docker-compose up -d
```

### Variáveis de Ambiente

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...
JWT_SECRET=seu_secret_aqui
```

---

## 📝 Licença

MIT

---

**Versão:** 1.0.0\*\*
