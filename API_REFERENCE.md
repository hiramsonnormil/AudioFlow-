# 📡 Phona API Reference (Frontend)

## Base URL
```
http://localhost:3000
```

## 🔐 Autenticação

### Signup
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}

Response 201:
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "plan": "free"
  }
}

Errors:
400 - missing_fields
409 - email_in_use
500 - signup_failed
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "string",
  "password": "string"
}

Response 200:
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "string",
    "username": "string",
    "email": "string",
    "plan": "free"
  }
}

Errors:
400 - missing_fields
401 - invalid_credentials
500 - login_failed
```

## 🎵 Jobs (Processamento)

### Criar Job
```http
POST /api/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "url": "https://youtube.com/watch?v=...",
  "preset": "SLOWED"
}

Response 201:
{
  "jobId": "string"
}

Errors:
400 - missing_fields | invalid_preset | url_not_supported
401 - unauthorized
500 - create_failed
```

### Presets Disponíveis:
- `SLOWED`
- `SPEED_125`
- `ULTRA_SLOWED`
- `MUFFLED_SLOWED`
- `MUFFLED_SPEED`
- `DAYCORE`
- `NIGHTCORE`
- `8D`

### Status do Job
```http
GET /api/jobs/:id/status
Authorization: Bearer <token>

Response 200:
{
  "jobId": "string",
  "status": "WAITING" | "PROCESSING" | "DONE" | "ERROR",
  "progress": 0-100,
  "error": "string" (se ERROR)
}

Errors:
404 - not_found
401 - unauthorized
```

### Download do Job
```http
GET /api/jobs/:id/download
Authorization: Bearer <token>

Response 200:
Content-Type: audio/mpeg
Content-Disposition: inline; filename="..."
Content-Length: <size>

[Binary audio data]

Errors:
404 - not found | file missing
400 - not ready
```

### Deletar Job Temporário
```http
DELETE /api/jobs/:id/temp
Authorization: Bearer <token>

Response 200:
{
  "ok": true
}

Errors:
404 - not_found
500 - delete_failed
```

## 🔄 Status Mapping (Backend → Frontend)

Backend Status → Frontend Display:
- `PENDING` → `WAITING`
- `DOWNLOADING` → `PROCESSING`
- `EXTRACTING` → `PROCESSING`
- `PROCESSING` → `PROCESSING`
- `DONE` → `DONE`
- (qualquer outro) → `ERROR`

## 📦 Exemplo de Fluxo Completo

```javascript
// 1. Login
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { token, user } = await loginResponse.json();

// 2. Criar Job
const jobResponse = await fetch('/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
    preset: 'SLOWED'
  })
});
const { jobId } = await jobResponse.json();

// 3. Poll Status (a cada 2s)
const pollStatus = async () => {
  const statusResponse = await fetch(`/api/jobs/${jobId}/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const status = await statusResponse.json();
  
  if (status.status === 'DONE') {
    // Pronto para download
    return status;
  } else if (status.status === 'ERROR') {
    throw new Error(status.error);
  } else {
    // Continuar polling
    setTimeout(pollStatus, 2000);
  }
};

// 4. Download
const downloadUrl = `/api/jobs/${jobId}/download`;
// Use em <a href="..." download>

// 5. Cleanup (opcional)
await fetch(`/api/jobs/${jobId}/temp`, {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## 🛡️ Autenticação

### Header Format
```
Authorization: Bearer <JWT_TOKEN>
```

### Token Storage (Frontend)
```javascript
// Salvar após login/signup
sessionStorage.setItem('phona:token', token);
sessionStorage.setItem('phona:user', JSON.stringify(user));

// Ler em cada request
const token = sessionStorage.getItem('phona:token');

// Limpar no logout
sessionStorage.removeItem('phona:token');
sessionStorage.removeItem('phona:user');
```

## 🔍 Códigos de Status HTTP

- `200` - OK (sucesso)
- `201` - Created (recurso criado)
- `400` - Bad Request (dados inválidos)
- `401` - Unauthorized (não autenticado)
- `404` - Not Found (recurso não existe)
- `409` - Conflict (ex: email já existe)
- `500` - Internal Server Error (erro do servidor)

## ⚠️ Tratamento de Erros (Frontend)

```javascript
try {
  const response = await fetch('/api/jobs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ url, preset })
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    // Erro da API
    const errorMessages = {
      'missing_fields': 'Preencha todos os campos',
      'invalid_credentials': 'E-mail ou senha incorretos',
      'email_in_use': 'E-mail já cadastrado',
      'url_not_supported': 'Use apenas links do YouTube',
      'invalid_preset': 'Preset inválido'
    };
    
    throw new Error(errorMessages[data.error] || data.error || 'Erro desconhecido');
  }
  
  return data;
} catch (error) {
  // Exibir para usuário
  showError(error.message);
}
```

## 🎯 Polling Inteligente

```javascript
async function pollJobStatus(jobId, onUpdate, options = {}) {
  const {
    interval = 2000,      // 2 segundos
    maxAttempts = 150,    // 5 minutos total
  } = options;
  
  let attempts = 0;
  
  const poll = async () => {
    attempts++;
    
    const status = await apiGetJobStatus(jobId);
    
    // Callback para UI
    if (onUpdate) onUpdate(status);
    
    if (status.status === 'DONE') {
      return status; // Sucesso
    }
    
    if (status.status === 'ERROR') {
      throw new Error(status.error);
    }
    
    if (attempts < maxAttempts) {
      setTimeout(poll, interval);
    } else {
      throw new Error('Timeout: processamento demorou muito');
    }
  };
  
  return poll();
}

// Uso:
await pollJobStatus(jobId, (status) => {
  updateProgress(status.progress);
  updateMessage(status.status);
});
```

## 💾 localStorage Schema (Plano Free)

```javascript
// Chave: 'phona:free:downloadJob'
{
  "jobId": "abc123",
  "url": "https://youtube.com/...",
  "preset": "SLOWED",
  "presetName": "Slowed",
  "fileName": "phona_slowed_1234567890.mp3",
  "downloadUrl": "/api/jobs/abc123/download",
  "createdAt": "2024-01-01T12:00:00.000Z"
}

// Salvar após processamento completo
localStorage.setItem('phona:free:downloadJob', JSON.stringify(job));

// Ler na página de download
const job = JSON.parse(localStorage.getItem('phona:free:downloadJob'));

// Remover ao sair
localStorage.removeItem('phona:free:downloadJob');
```

## 🧪 Testando API com curl

```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"12345678"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"12345678"}'

# Criar Job (substitua TOKEN)
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"url":"https://youtube.com/watch?v=dQw4w9WgXcQ","preset":"SLOWED"}'

# Status (substitua TOKEN e JOB_ID)
curl http://localhost:3000/api/jobs/JOB_ID/status \
  -H "Authorization: Bearer TOKEN"

# Download (substitua TOKEN e JOB_ID)
curl http://localhost:3000/api/jobs/JOB_ID/download \
  -H "Authorization: Bearer TOKEN" \
  -o output.mp3
```

## 📊 Rate Limits & Limites

- **Polling interval**: Mínimo 1s (recomendado 2s)
- **Timeout**: Máximo 5 minutos de polling
- **File size**: Depende do backend
- **Concurrent jobs**: 1 por vez (plano Free)

## 🔗 URLs Frontend

```
Landing:   /html/index.html  (pública)
Login:     /html/login.html  (pública)
Signup:    /html/signup.html (pública)
App:       /html/index.html    (protegida)
Download:  /html/download.html (protegida)
```

---

**Última atualização:** Novembro 2024  
**Versão API:** 1.0  
**Backend:** Express + MongoDB
