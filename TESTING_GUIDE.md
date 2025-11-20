# 🧪 Guia de Testes - Phona Frontend

## Pré-requisitos

1. Servidor backend rodando (Node.js + MongoDB)
2. Servidor web servindo a pasta `public/`
3. Browser moderno com suporte a ES6 modules

## 🚀 Como Iniciar

```bash
# Na raiz do projeto
npm install
npm start

# Ou com Docker
docker-compose up
```

Acesse: `http://localhost:3000`

## ✅ Checklist de Testes

### 1. Landing Page (`/` ou `/html/index.html`)

- [ ] Página carrega sem erros no console
- [ ] Animações de waveform funcionam
- [ ] Links "Entrar" e "Criar conta" no nav estão visíveis
- [ ] Botão "Criar conta" tem estilo destacado (copper gradient)
- [ ] Scroll suave funciona
- [ ] Design mantém identidade visual (copper, peach, charcoal)

### 2. Página de Signup (`/html/signup.html`)

**Acesso:**
- [ ] Clicar em "Criar conta" na landing
- [ ] Acesso direto via URL funciona
- [ ] Se já logado, redireciona para `/app`

**Validações:**
- [ ] Username vazio → erro
- [ ] Username com menos de 3 caracteres → erro
- [ ] Email vazio → erro
- [ ] Email inválido → erro
- [ ] Senha vazia → erro
- [ ] Senha com menos de 8 caracteres → erro
- [ ] Senhas não coincidem → erro

**Funcionalidades:**
- [ ] Toggle de mostrar/ocultar senha funciona
- [ ] Mensagens de erro aparecem em vermelho
- [ ] Email duplicado retorna erro da API
- [ ] Signup bem-sucedido:
  - [ ] Token salvo em sessionStorage
  - [ ] User salvo em sessionStorage
  - [ ] Redireciona para `/app`

**Visual:**
- [ ] Background com gradientes copper/peach
- [ ] Card centralizado
- [ ] Botões com estilo copper
- [ ] Inputs com foco copper
- [ ] Responsivo em mobile

### 3. Página de Login (`/html/login.html`)

**Acesso:**
- [ ] Clicar em "Entrar" na landing
- [ ] Link "Já tenho conta" no signup
- [ ] Acesso direto via URL
- [ ] Se já logado, redireciona para `/app`

**Validações:**
- [ ] Email vazio → erro
- [ ] Email inválido → erro
- [ ] Senha vazia → erro
- [ ] Credenciais inválidas → erro da API

**Funcionalidades:**
- [ ] Toggle de senha funciona
- [ ] Login bem-sucedido:
  - [ ] Token em sessionStorage
  - [ ] User em sessionStorage
  - [ ] Redireciona para `/app`
- [ ] Link "Criar conta" funciona
- [ ] Link "Voltar para home" funciona

### 4. Página de App (`/html/app.html`)

**Proteção:**
- [ ] Sem autenticação → redireciona para `/login`
- [ ] Com autenticação → carrega normalmente

**Navbar:**
- [ ] Logo "phona" visível
- [ ] Avatar com inicial do username
- [ ] Nome do usuário visível (desktop)
- [ ] Botão "Sair" funciona:
  - [ ] Limpa sessionStorage
  - [ ] Redireciona para `/login`

**Presets:**
- [ ] 8 presets renderizados em grid
- [ ] Cada preset tem ícone, nome e descrição
- [ ] Seleção visual funciona (borda copper)
- [ ] Apenas um preset selecionável por vez

**Formulário:**
- [ ] Input de URL com ícone de link
- [ ] Placeholder correto
- [ ] Validações:
  - [ ] URL vazia → alert
  - [ ] URL não-YouTube → alert
  - [ ] Preset não selecionado → alert

**Processamento:**
1. [ ] Cole URL válida do YouTube
2. [ ] Selecione preset (ex: Slowed)
3. [ ] Clique "Processar áudio"
4. [ ] Status area aparece com animação
5. [ ] Ícone muda: 📤 → ⚙️ → ✅
6. [ ] Progresso aumenta de 10% → 100%
7. [ ] Mensagens contextuais aparecem
8. [ ] Job salvo no localStorage:
   ```javascript
   localStorage.getItem('phona:free:downloadJob')
   // Deve retornar objeto com jobId, preset, etc.
   ```
9. [ ] Botão "Baixar áudio" aparece
10. [ ] Clique no botão → redireciona para `/download`

**Tratamento de Erros:**
- [ ] URL inválida do YouTube → erro da API
- [ ] Preset inválido → erro da API
- [ ] Erro de processamento → ícone ❌
- [ ] Botão "Tentar novamente" aparece

**Info Cards:**
- [ ] 3 cards informativos na parte inferior
- [ ] Ícones e textos corretos
- [ ] Design consistente

### 5. Página de Download (`/html/download.html`)

**Proteção:**
- [ ] Sem autenticação → redireciona para `/login`

**Estados:**

**A) Com Job no localStorage:**
1. [ ] Loading inicial aparece
2. [ ] Transição para estado "pronto"
3. [ ] Informações corretas:
   - [ ] Preset com ícone correto
   - [ ] Nome do arquivo
4. [ ] Aviso de "arquivo temporário" visível
5. [ ] Botão de download funciona:
   - [ ] URL aponta para `/api/jobs/:id/download`
   - [ ] Atributo `download` presente
   - [ ] Arquivo baixa corretamente
6. [ ] Botão "Processar outro áudio" funciona:
   - [ ] Job removido do localStorage
   - [ ] Redireciona para `/app`

**B) Sem Job no localStorage:**
1. [ ] Estado vazio aparece
2. [ ] Mensagem clara
3. [ ] Botão "Processar áudio agora" → `/app`

**Limpeza (Plano Free):**
1. [ ] Abra console: `localStorage.getItem('phona:free:downloadJob')`
2. [ ] Navegue para `/app` (clique no logo)
3. [ ] Console: job deve ser `null`
4. [ ] Volte para `/download`
5. [ ] Estado vazio deve aparecer

**Responsivo:**
- [ ] Layout funciona em mobile
- [ ] Card centralizado
- [ ] Botões empilhados verticalmente

### 6. Router e Guards

**Rotas Protegidas (sem auth):**
```javascript
// No console, limpe sessão:
sessionStorage.clear()
```
- [ ] `/html/app.html` → redireciona para `/login`
- [ ] `/html/download.html` → redireciona para `/login`

**Rotas Auth (com auth):**
```javascript
// Faça login primeiro, depois:
```
- [ ] `/html/login.html` → redireciona para `/app`
- [ ] `/html/signup.html` → redireciona para `/app`

**Navegação:**
- [ ] Landing → Login → funciona
- [ ] Login → Signup → funciona
- [ ] Signup → App (auto) → funciona
- [ ] App → Download → funciona
- [ ] Download → App (back) → funciona
- [ ] Logout em qualquer lugar → Login

### 7. Sessão e Storage

**sessionStorage (`phona:token` e `phona:user`):**
```javascript
// No console, após login:
sessionStorage.getItem('phona:token')    // JWT token
sessionStorage.getItem('phona:user')     // JSON com user data
```

**localStorage (`phona:free:downloadJob`):**
```javascript
// Após processar job:
localStorage.getItem('phona:free:downloadJob')
// Objeto com: jobId, preset, fileName, downloadUrl, etc.

// Após sair de /download:
localStorage.getItem('phona:free:downloadJob')  // null
```

### 8. API Integration

**Network Tab (DevTools):**

Login/Signup:
- [ ] `POST /api/auth/login` → 200 com token
- [ ] `POST /api/auth/signup` → 201 com token

Job Processing:
- [ ] `POST /api/jobs` → 201 com jobId
- [ ] `GET /api/jobs/:id/status` → 200 (polling)
- [ ] Header `Authorization: Bearer <token>` presente

Download:
- [ ] `GET /api/jobs/:id/download` → 200 audio/mpeg
- [ ] `DELETE /api/jobs/:id/temp` → 200 (ao sair)

**Erros:**
- [ ] Credenciais inválidas → mensagem amigável
- [ ] Email em uso → mensagem específica
- [ ] URL inválida → mensagem específica
- [ ] Timeout → tratado gracefully

### 9. Visual e UX

**Cores:**
- [ ] Copper (#c28c66) usado em botões primários
- [ ] Peach (#e8b4a0) em gradientes
- [ ] Charcoal (#1a1a1a) como base escura
- [ ] Texto cream (#f5f1ed)

**Transições:**
- [ ] Hover em botões suave
- [ ] Cards com elevação no hover
- [ ] Inputs com foco copper glow
- [ ] Loading spinners animados

**Tipografia:**
- [ ] Títulos em Space Grotesk
- [ ] Corpo em Inter
- [ ] Hierarquia clara

**Responsividade:**
- [ ] Desktop (>1024px) → 3 colunas de presets
- [ ] Tablet (768-1024px) → 2 colunas
- [ ] Mobile (<768px) → 1-2 colunas, stack vertical

### 10. Acessibilidade

- [ ] Navegação por teclado funciona
- [ ] Tab order lógico
- [ ] Focus visible em todos elementos interativos
- [ ] Labels em todos inputs
- [ ] Contraste de cores adequado (WCAG AA)
- [ ] Mensagens de erro anunciáveis
- [ ] Sem texto ilegível

## 🐛 Bugs Comuns e Soluções

### "Module not found"
→ Verifique se o servidor suporta ES6 modules
→ Adicione `type="module"` nos scripts

### "CORS error"
→ Backend deve permitir origin do frontend
→ Verifique `cors()` no Express

### "Token undefined"
→ Verifique se login salvou em sessionStorage
→ API client deve ler de sessionStorage

### Download não funciona
→ URL deve ser completa: `http://localhost:3000/api/jobs/...`
→ Verificar se backend retorna headers corretos

### Polling infinito
→ Verificar se status muda para "DONE"
→ Verificar maxAttempts (150 = 5min)

### localStorage não limpa
→ Chamar `removeLocal()` explicitamente
→ Verificar event listeners de navegação

## 📊 Métricas de Sucesso

- [ ] 0 erros no console
- [ ] Todas as rotas funcionais
- [ ] Autenticação completa
- [ ] Processamento end-to-end
- [ ] Download funciona
- [ ] Limpeza do plano Free OK
- [ ] Design idêntico ao original
- [ ] Performance fluida (<100ms interações)
- [ ] Mobile funcional

## 🎯 Teste de Fluxo Completo (Happy Path)

1. **Landing** → Clique "Criar conta"
2. **Signup** → Preencha e envie
3. **App** → Carrega automaticamente
4. **Processamento** → 
   - Cole: `https://youtube.com/watch?v=dQw4w9WgXcQ`
   - Selecione: Slowed
   - Clique: Processar
5. **Aguarde** → Progresso até 100%
6. **Download** → Clique "Baixar áudio"
7. **Download Page** → Arquivo baixa
8. **Voltar** → Clique "Processar outro áudio"
9. **Download** (teste) → Acesse diretamente
10. **Estado Vazio** → Deve aparecer

**Tempo esperado:** ~2-5 minutos (depende do processamento)

## 🔧 Debug Tips

### Console Commands Úteis:

```javascript
// Ver sessão atual
sessionStorage.getItem('phona:token')
sessionStorage.getItem('phona:user')

// Ver job free
localStorage.getItem('phona:free:downloadJob')

// Limpar tudo
sessionStorage.clear()
localStorage.clear()

// Forçar logout
import { clearSession } from './js/auth/session.js'
clearSession()

// Testar API manualmente
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', password: '12345678' })
}).then(r => r.json()).then(console.log)
```

---

## ✅ Critérios de Aprovação

- [ ] Todas as funcionalidades implementadas
- [ ] Design fiel ao original
- [ ] 0 erros críticos
- [ ] Autenticação funcional
- [ ] Processamento completo
- [ ] Plano Free implementado corretamente
- [ ] Código limpo e modular
- [ ] Responsivo
- [ ] Acessível

**Status Final:** ___________

**Observações:** ___________
