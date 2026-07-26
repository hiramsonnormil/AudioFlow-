# Como exportar cookies do YouTube para o AudioFlow

O YouTube está bloqueando downloads sem autenticação.
Para resolver, exporte seus cookies do YouTube para um arquivo `cookies.txt`
e coloque-o na **raiz do projeto** (junto com `server.js`).

## Método 1 — Extensão do Navegador (mais fácil)

1. Instale a extensão **"Get cookies.txt LOCALLY"** no Chrome ou Firefox:
   - Chrome: https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/cookies-txt/

2. Acesse https://www.youtube.com e **faça login** na sua conta Google

3. Clique no ícone da extensão e exporte os cookies (formato Netscape)

4. Salve o arquivo como `cookies.txt` na raiz do projeto:
   ```
   /home/son/AudioFlow-/cookies.txt
   ```

## Método 2 — yt-dlp direto (se o Chrome estiver instalado)

```bash
# Feche o Chrome completamente antes de rodar
yt-dlp --cookies-from-browser chrome --cookies cookies.txt -j "https://youtube.com"
```

## Verificar se funcionou

```bash
yt-dlp --cookies cookies.txt -j --no-warnings "https://www.youtube.com/watch?v=DPBRGWUgQsA"
```

Se retornar JSON com título e duração, está funcionando!

---

O app detecta automaticamente o arquivo `cookies.txt` na raiz do projeto.
Não é necessário reiniciar o servidor — o arquivo é lido a cada requisição.
