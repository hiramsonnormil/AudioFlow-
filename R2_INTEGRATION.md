# 🌩️ Integração Cloudflare R2 - Phona AudioFlow

## 📋 Visão Geral

Este projeto implementa a integração completa com **Cloudflare R2** para armazenamento de arquivos de áudio processados. O R2 é compatível com o protocolo S3 da AWS, permitindo usar o AWS SDK v3 para todas as operações.

### 🎯 Características Principais

- ✅ Upload automático para R2 após processamento
- ✅ Deleção automática de arquivos locais temporários
- ✅ Expiração de 1 hora para usuários free
- ✅ Listagem de processamentos recentes filtrada por usuário
- ✅ Limpeza automática de objetos expirados
- ✅ URLs públicas para download direto

---

## 🚀 Configuração

### 1. Variáveis de Ambiente

Adicione estas variáveis ao seu arquivo `.env`:

```env
# Cloudflare R2 Configuration
R2_ACCESS_KEY_ID=seu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=seu_secret_access_key_aqui
R2_ENDPOINT=https://seu-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=seu-bucket-name
```

### 2. Como obter as credenciais R2

1. Acesse o [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Vá em **R2** > **Overview**
3. Crie um bucket se ainda não tiver
4. Vá em **Manage R2 API Tokens**
5. Crie um novo token com permissões de leitura/escrita
6. Copie: `Access Key ID`, `Secret Access Key`, `Endpoint` e `Bucket Name`

---

## 📁 Estrutura de Arquivos

```
storage/
  └── r2.js              # Módulo principal de integração R2

src/
  ├── controllers/
  │   └── FreeUserController.js  # Controller para usuários free
  ├── routes/
  │   ├── r2Test.js     # Rotas de teste
  │   └── free.js       # Rotas de produção para users free
  └── services/
      └── AudioProcessingService.js  # Atualizado com método processAndUploadToR2()

test-r2.sh              # Script de teste automatizado
```

---

## 🔧 API - Endpoints de Teste

### 1. **Upload de Teste**

Simula o upload de um arquivo processado para o R2.

```bash
POST /api/r2-test/upload-test

Body:
{
  "userId": "test-user-123",
  "preset": "NIGHTCORE",
  "jobId": "job-12345"
}

Response:
{
  "success": true,
  "data": {
    "key": "free/test-user-123/job-12345.mp3",
    "publicUrl": "https://<account>.r2.cloudflarestorage.com/<bucket>/free/test-user-123/job-12345.mp3",
    "expiresIn": "1 hora"
  }
}
```

### 2. **Listar Processamentos Recentes**

Lista arquivos do usuário que ainda não expiraram (menos de 1h).

```bash
GET /api/r2-test/recent-free?userId=test-user-123

Response:
{
  "success": true,
  "totalProcessamentos": 2,
  "processamentos": [
    {
      "jobId": "job-12345",
      "fileName": "job-12345.mp3",
      "createdAt": "2025-11-20T10:30:00.000Z",
      "expiresInMinutes": 45,
      "size": 5242880,
      "downloadUrl": "https://..."
    }
  ]
}
```

### 3. **Limpeza Manual**

Força a deleção de arquivos expirados (mais de 1h).

```bash
POST /api/r2-test/cleanup

Body:
{
  "userId": "test-user-123"
}

Response:
{
  "success": true,
  "deleted": 3,
  "errors": 0
}
```

### 4. **Deletar Arquivo Específico**

```bash
DELETE /api/r2-test/delete/free/test-user-123/job-12345.mp3

Response:
{
  "success": true,
  "message": "Objeto deletado com sucesso"
}
```

---

## 🎵 API - Endpoints de Produção (Usuários Free)

### 1. **Processar Áudio**

Processa um vídeo do YouTube e retorna URL do R2.

```bash
POST /api/free/process

Body:
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "preset": "NIGHTCORE"
}

Response:
{
  "success": true,
  "jobId": "job_1234567890_abc123",
  "downloadUrl": "https://...",
  "metadata": {
    "title": "Never Gonna Give You Up",
    "preset": "NIGHTCORE",
    "duration": 213,
    "expiresIn": "1 hora"
  }
}
```

### 2. **Processamentos Recentes**

Lista os processamentos disponíveis do usuário logado.

```bash
GET /api/free/recent

Response:
{
  "success": true,
  "total": 2,
  "processamentos": [
    {
      "jobId": "job_1234567890_abc123",
      "fileName": "job_1234567890_abc123.mp3",
      "createdAt": "2025-11-20T10:30:00.000Z",
      "expiresInMinutes": 45,
      "downloadUrl": "https://..."
    }
  ]
}
```

---

## 🧪 Testando a Integração

### Método 1: Script Automatizado

```bash
./test-r2.sh
```

Este script executa todos os testes automaticamente e exibe o resultado.

### Método 2: Testes Manuais com cURL

```bash
# 1. Upload
curl -X POST http://localhost:3000/api/r2-test/upload-test \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "preset": "NIGHTCORE"}'

# 2. Listar
curl http://localhost:3000/api/r2-test/recent-free?userId=test-user-123

# 3. Limpar expirados
curl -X POST http://localhost:3000/api/r2-test/cleanup \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

---

## 📦 Estrutura de Armazenamento no R2

Os arquivos são organizados da seguinte forma:

```
seu-bucket-name/
  └── free/
      └── user-id/
          ├── job-123.mp3
          ├── job-456.mp3
          └── job-789.mp3
```

**Metadados armazenados em cada objeto:**
- `x-amz-meta-user-id`: ID do usuário
- `x-amz-meta-created-at`: Timestamp ISO de criação
- `x-amz-meta-preset`: Preset usado no processamento
- `x-amz-meta-job-id`: ID único do job

---

## ⏰ Limpeza Automática (Usuários Free)

### Como Funciona

1. **Expiração**: Arquivos de usuários free expiram após 1 hora
2. **Verificação**: A cada listagem, objetos expirados são detectados e deletados
3. **Limpeza manual**: Endpoint `/api/free/cleanup` pode ser chamado manualmente
4. **Cron job**: Configure um cron para executar limpeza periódica

### Exemplo de Cron Job

Adicione ao seu `crontab` para limpar a cada 30 minutos:

```bash
*/30 * * * * curl -X POST http://localhost:3000/api/r2-test/cleanup -H "Content-Type: application/json" -d '{"userId": "*"}'
```

---

## 🔄 Fluxo Completo de Processamento

```
1. Usuário envia URL + Preset
          ↓
2. Backend baixa áudio do YouTube (stream)
          ↓
3. FFmpeg processa em /tmp/job-xxx.mp3
          ↓
4. Upload para R2: free/user-id/job-xxx.mp3
          ↓
5. Arquivo /tmp deletado
          ↓
6. URL pública retornada ao usuário
          ↓
7. Após 1h: arquivo deletado do R2
```

---

## 🛠️ Funções Principais do Módulo R2

### `uploadFile(localPath, key, options)`
Faz upload de arquivo local para o R2.

**Parâmetros:**
- `localPath`: Caminho do arquivo no servidor
- `key`: Chave no R2 (ex: `free/user123/job456.mp3`)
- `options`: Metadados (userId, preset, etc)

**Retorna:**
```javascript
{
  key: "free/user123/job456.mp3",
  publicUrl: "https://..."
}
```

### `getPublicUrl(key)`
Gera URL pública a partir da chave.

### `deleteObject(key)`
Deleta um objeto do R2.

### `cleanupExpiredFreeObjects(userId)`
Lista e deleta objetos expirados de um usuário.

**Retorna:**
```javascript
{
  deleted: 5,
  errors: 0
}
```

### `listFreeUserObjects(userId)`
Lista objetos válidos (não expirados) de um usuário.

**Retorna:**
```javascript
[
  {
    key: "free/user123/job456.mp3",
    fileName: "job456.mp3",
    jobId: "job456",
    size: 5242880,
    createdAt: "2025-11-20T10:30:00.000Z",
    expiresIn: 2700000, // ms restantes
    publicUrl: "https://..."
  }
]
```

### `deleteLocalFile(localPath)`
Deleta arquivo local após upload. Não lança erro se falhar.

---

## 📊 Monitoramento e Logs

Todos os logs seguem o padrão:

```
[R2] Iniciando upload: /tmp/job-123.mp3 -> free/user456/job-123.mp3
[R2] Upload concluído: https://...
[R2] Deletando arquivo local: /tmp/job-123.mp3
[R2] Listando objetos do usuário free: user456
[R2] 3 objetos válidos encontrados para user456
[R2] Objeto expirado detectado: free/user456/old-job.mp3
```

---

## ⚠️ Importante

1. **Nunca salve arquivos de áudio permanentemente no servidor**
   - Use apenas `/tmp` para arquivos temporários
   - Sempre delete após upload para R2

2. **Usuários free: 1 hora de retenção**
   - Arquivos são deletados automaticamente após 1h
   - Não há histórico permanente

3. **URLs públicas**
   - Por enquanto, URLs são públicas (sem assinatura temporária)
   - Para produção, considere implementar URLs assinadas

4. **Backup**
   - Configure lifecycle rules no R2 se precisar de backup adicional

---

## 🐛 Troubleshooting

### Erro: "Não foi possível extrair Account ID"
- Verifique se `R2_ENDPOINT` está no formato correto
- Formato: `https://<account-id>.r2.cloudflarestorage.com`

### Erro: "InvalidAccessKeyId"
- Verifique `R2_ACCESS_KEY_ID` e `R2_SECRET_ACCESS_KEY`
- Certifique-se de que o token tem permissões corretas

### Arquivos não aparecem na listagem
- Verifique se já passaram de 1 hora (foram expirados)
- Confirme que o `userId` está correto

### Upload lento
- R2 tem limites de bandwidth no plano free
- Considere upgrade para melhor performance

---

## 📚 Referências

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/)

---

## ✅ Checklist de Implementação

- [x] Instalar `@aws-sdk/client-s3`
- [x] Criar módulo `storage/r2.js`
- [x] Configurar variáveis de ambiente
- [x] Criar endpoints de teste
- [x] Criar endpoints de produção
- [x] Atualizar `AudioProcessingService` com método `processAndUploadToR2()`
- [x] Implementar limpeza automática de expirados
- [x] Criar script de testes
- [x] Documentar API

---

**Desenvolvido para Phona AudioFlow** 🎵
