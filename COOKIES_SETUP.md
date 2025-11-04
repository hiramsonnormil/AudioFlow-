# Configuração de Cookies do YouTube para yt-dlp

Se você estiver recebendo o erro:

```
ERROR: [youtube] xxxxx: Sign in to confirm you're not a bot
```

Siga uma dessas soluções:

## Solução 1: Usar Cookies do Navegador (Recomendado)

### No Firefox:

```bash
cd "fist version"
yt-dlp --cookies-from-browser firefox --cookies cookies.txt https://www.youtube.com
```

### No Chrome/Chromium:

```bash
cd "fist version"
yt-dlp --cookies-from-browser chrome --cookies cookies.txt https://www.youtube.com
```

Isso criará um arquivo `cookies.txt` no diretório do projeto.

## Solução 2: Exportar Cookies Manualmente

1. Abra o YouTube no navegador e faça login
2. Use a extensão "Get cookies.txt" ou similar
3. Salve o arquivo como `cookies.txt` na raiz do projeto

## Solução 3: Atualizar yt-dlp

```bash
pip install --upgrade yt-dlp
```

## Verificar se os Cookies Funcionam

```bash
cd "fist version"
yt-dlp --cookies cookies.txt https://www.youtube.com/watch?v=VIDEO_ID
```

Se não houver erros, seus cookies estão configurados corretamente!

## Arquivo Esperado

Coloque o arquivo `cookies.txt` na pasta raiz do projeto:

```
fist version/
├── cookies.txt      ← Coloque aqui
├── server.js
├── package.json
└── ...
```

## Autoinicialização

Se você tiver o `cookies.txt` na pasta, o servidor automaticamente:

1. Detectará o arquivo
2. Usará os cookies para autenticação
3. Permitirá downloads mesmo com restrições do YouTube

---

**Dica**: Mantenha os cookies atualizados (~1-2 meses de validade)
