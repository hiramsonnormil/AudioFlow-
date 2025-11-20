# 🔧 Configuração CORS no Cloudflare R2

## Problema
Os arquivos estão sendo salvos no R2 mas o download direto não funciona porque o bucket não está configurado para CORS (Cross-Origin Resource Sharing).

## Sintoma
- Erro no console: "blocked by CORS policy"
- Download falha mesmo com URL pública válida

## Solução: Configurar CORS no Cloudflare Dashboard

### 1. Acesse o Dashboard do Cloudflare
1. Vá para https://dash.cloudflare.com/
2. Faça login na sua conta
3. Navegue para **R2** no menu lateral

### 2. Selecione seu Bucket
1. Clique no bucket **phona** (ou o nome do seu bucket)
2. Vá para a aba **Settings** (Configurações)

### 3. Configure CORS Policy

Adicione a seguinte configuração CORS:

```json
[
  {
    "AllowedOrigins": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

### 4. Configuração Alternativa (Mais Restritiva)

Se você quiser restringir apenas ao seu domínio:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8080",
      "https://seudominio.com"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Authorization",
      "Content-Type",
      "Range"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Type",
      "Content-Range"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

## Alternativa: Usar Domínio Customizado no R2

Se você quiser mais controle, pode configurar um domínio customizado:

### 1. No Cloudflare Dashboard
1. Vá para o bucket no R2
2. Clique em **Settings** > **Custom Domains**
3. Adicione um subdomínio (exemplo: `cdn.seudominio.com`)
4. Configure o DNS automaticamente

### 2. Atualizar getPublicUrl() no código

Edite `storage/r2.js`:

```javascript
function getPublicUrl(key) {
  // Opção 1: Usar domínio customizado (recomendado para produção)
  const CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN; // exemplo: cdn.seudominio.com
  if (CUSTOM_DOMAIN) {
    return `https://${CUSTOM_DOMAIN}/${key}`;
  }
  
  // Opção 2: Usar URL padrão do R2
  if (!_s3) ensureClient();
  const accountId = getAccountIdFromEndpoint();
  if (!accountId) {
    throw new Error('Não foi possível extrair Account ID do endpoint R2');
  }
  return `https://${accountId}.r2.cloudflarestorage.com/${_BUCKET}/${key}`;
}
```

## Solução Temporária: Proxy no Backend

Se você não pode configurar CORS agora, pode fazer proxy dos downloads:

### 1. Criar endpoint de proxy

Crie `src/routes/download.js`:

```javascript
import express from 'express';
import { authRequired } from '../middleware/authRequired.js';
import fetch from 'node-fetch';

const router = express.Router();

router.get('/download/:key(*)', authRequired, async (req, res) => {
  try {
    const key = req.params.key;
    const userId = req.user.email || req.user._id;
    
    // Verificar se o arquivo pertence ao usuário
    if (!key.startsWith(`free/${userId}/`)) {
      return res.status(403).json({ error: 'unauthorized' });
    }
    
    // Buscar arquivo do R2
    const r2Url = getPublicUrl(key);
    const response = await fetch(r2Url);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'file_not_found' });
    }
    
    // Copiar headers
    res.set('Content-Type', response.headers.get('content-type'));
    res.set('Content-Length', response.headers.get('content-length'));
    res.set('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
    
    // Stream do arquivo
    response.body.pipe(res);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 2. Registrar no server.js:

```javascript
import downloadRoutes from './src/routes/download.js';
app.use('/api', downloadRoutes);
```

### 3. Atualizar recents.js para usar o proxy:

```javascript
// Ao invés de:
<a href="${proc.publicUrl}" ...>

// Use:
<a href="/api/download/${proc.key}" ...>
```

## Verificação

Depois de configurar CORS:

1. Limpe o cache do navegador
2. Teste o download na página de processamentos recentes
3. Verifique o console do navegador (não deve ter erro de CORS)

## Links Úteis

- [Documentação Cloudflare R2 CORS](https://developers.cloudflare.com/r2/api/s3/api/#cors)
- [AWS S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
