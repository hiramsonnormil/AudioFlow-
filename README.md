# AudioFlow

Audio processing API. Recebe uma URL do YouTube, aplica um efeito (preset) e devolve o áudio processado.

## O que faz

- Baixa o áudio de um vídeo do YouTube
- Aplica efeitos via FFmpeg (slowed, nightcore, 8D, etc.)
- Hospeda o resultado no Cloudflare R2 com link temporário de 24h
- Autenticação via JWT (login local ou Google OAuth)

## Stack

Node.js, Express, MongoDB (Mongoose), Cloudflare R2, FFmpeg.

## Rodando local

```bash
npm install
cp .env.example .env   # preencher as variáveis
npm run dev
```

Servidor sobe em `http://localhost:8080` por padrão (variável `PORT`).

## Variáveis de ambiente

As obrigatórias estão em `.env.example`. Resumo:

| Variável | Para quê |
|---|---|
| `MONGODB_URI` | Conexão com o MongoDB |
| `JWT_SECRET` | Assinatura dos tokens |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` / `R2_ENDPOINT` | Cloudflare R2 (upload dos áudios) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Login com Google (opcional) |

## Endpoints

| Método | Rota | O que faz |
|---|---|---|
| POST | `/api/process` | Inicia o processamento de uma URL do YouTube |
| GET | `/api/status/:id` | Status do job |
| GET | `/api/download/:key` | Baixa o áudio processado |
| GET | `/api/recent-processings` | Lista os processamentos recentes |
| POST | `/api/auth/register` | Cria conta local |
| POST | `/api/auth/login` | Login local |
| GET | `/api/auth/google` | Login com Google |

## Estrutura

```
server.js              # entrada
src/
  controllers/         # process, auth, download
  routes/              # processRoutes, download, recents, jobs
  services/            # processamento de áudio, fila de jobs
  middleware/          # auth JWT
  models/              # Job
  utils/               # ffmpeg, storage
  config/              # segurança, limites
public/                # frontend estático
storage/               # R2 (r2.js)
```

## Limites

- Duração máxima por áudio: 15 minutos
- Arquivos expiram em 24h

## Docs

`docs/` tem notas de integração frontend/backend e hardening de segurança.
