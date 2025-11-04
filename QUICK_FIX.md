# 🎵 Audio FX Processor - Solução para Erro de Autenticação YouTube

## ❌ Problema

O YouTube está bloqueando `yt-dlp` com a mensagem:

```
Sign in to confirm you're not a bot
```

## ✅ Solução Rápida

### Passo 1: Prepare os Cookies

#### **Para Linux/macOS:**

```bash
cd "fist version"
bash setup_cookies.sh
```

#### **Para Windows:**

```cmd
cd "fist version"
setup_cookies.bat
```

### Passo 2: Escolha seu Navegador

- Firefox
- Chrome / Chromium / Edge / Brave
- Safari (macOS)

### Passo 3: Pronto!

Um arquivo `cookies.txt` será criado. O servidor automaticamente detectará e usará.

---

## 🔧 Alternativa Manual

Se os scripts não funcionarem:

### Linux/macOS:

```bash
cd "fist version"
yt-dlp --cookies-from-browser firefox --cookies cookies.txt https://www.youtube.com
```

### Windows:

```cmd
cd "fist version"
yt-dlp --cookies-from-browser chrome --cookies cookies.txt https://www.youtube.com
```

---

## 📝 Verificação

Para testar se os cookies funcionam:

```bash
yt-dlp --cookies cookies.txt https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

Se funcionar, o servidor agora conseguirá baixar áudios!

---

## ⚠️ Importante

- **Cookies expiram**: Regenere a cada 1-2 meses
- **Segurança**: Não compartilhe o arquivo `cookies.txt`
- **Tamanho**: O arquivo é pequeno (~1-5 KB)

---

## 🚀 Iniciando o Servidor

Após configurar os cookies:

```bash
npm start
# ou
node server.js
```

O servidor estará em: `http://localhost:8080`

---

## 💡 Se ainda não funcionar

1. Certifique-se que `cookies.txt` está na pasta raiz
2. Tente regenerar os cookies
3. Atualize yt-dlp: `pip install --upgrade yt-dlp`
4. Verifique a conexão com a internet
