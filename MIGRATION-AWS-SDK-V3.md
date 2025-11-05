# Migração para AWS SDK v3 - DigitalOcean Spaces

## 📋 Resumo da Migração

Migramos de **aws-sdk v2** (desaprovado) para **@aws-sdk/client-s3 v3** (moderna e leve).

## ✅ O Que Mudou

### Antes (v2 - Desaprovado)

```javascript
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(process.env.DO_SPACES_ENDPOINT),
  accessKeyId: process.env.DO_SPACES_KEY,
  secretAccessKey: process.env.DO_SPACES_SECRET,
  region: process.env.DO_SPACES_REGION || "nyc3",
  s3ForcePathStyle: true,
  signatureVersion: "v4",
});

// Upload
await s3.upload(uploadParams).promise();

// Delete
await s3.deleteObject(deleteParams).promise();
```

### Depois (v3 - Moderno)

```javascript
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION || "nyc3",
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY,
    secretAccessKey: process.env.DO_SPACES_SECRET,
  },
  endpoint: `https://${process.env.DO_SPACES_ENDPOINT}`,
  forcePathStyle: true,
});

// Upload
const uploadCommand = new PutObjectCommand(uploadParams);
await s3Client.send(uploadCommand);

// Delete
const deleteCommand = new DeleteObjectCommand(deleteParams);
await s3Client.send(deleteCommand);
```

## 🎯 Benefícios da Migração

| Aspecto          | v2            | v3                  |
| ---------------- | ------------- | ------------------- |
| **Tamanho**      | 850KB+        | ~150KB ✅           |
| **Modular**      | Monolítico    | Apenas S3 ✅        |
| **Performance**  | Mais lento    | Mais rápido ✅      |
| **Suporte**      | Descontinuado | Ativo ✅            |
| **ESM**          | Limitado      | Suporte completo ✅ |
| **Tree-shaking** | Não           | Sim ✅              |

## 📦 Dependências Atualizadas

### Antes

```json
{
  "aws-sdk": "^2.1692.0"
}
```

### Depois

```json
{
  "@aws-sdk/client-s3": "^3.450.0"
}
```

**Economia**: 700KB+ no bundle!

## 🔧 Como Instalar

```bash
npm install
# Instala @aws-sdk/client-s3 automaticamente
```

## ✅ Testes

### Upload para DigitalOcean Spaces

```bash
# Funciona normalmente
curl -X POST http://localhost:8080/process \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=...", "preset":"SLOWED"}'
```

### Limpeza automática (a cada 1 hora)

Arquivos expirados (48h) são deletados automaticamente do DigitalOcean Spaces.

## 🚀 Próximas Otimizações (Opcional)

Se precisar de múltiplas operações S3:

```bash
npm install @aws-sdk/lib-storage
```

Para upload de arquivos grandes com progresso:

```javascript
import { Upload } from "@aws-sdk/lib-storage";

const upload = new Upload({
  client: s3Client,
  params: uploadParams,
});

upload.on("httpUploadProgress", (progress) => {
  console.log(`Uploaded: ${progress.loaded}/${progress.total}`);
});

await upload.done();
```

## 📝 Notas Importantes

1. ✅ DigitalOcean Spaces é S3-compatível
2. ✅ AWS SDK v3 funciona perfeitamente com DO Spaces
3. ✅ Sem mudanças nas variáveis de ambiente
4. ✅ Sem mudanças nos endpoints

## 🔗 Referências

- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/)
- [Blog Post AWS SDK v3](https://a.co/cUPnyil)
- [DigitalOcean Spaces Docs](https://docs.digitalocean.com/products/spaces/)

---

**Status**: ✅ Migração Completa
**Data**: 5 de novembro de 2025
**Arquivo**: `server.js`
