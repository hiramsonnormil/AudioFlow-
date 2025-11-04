# ✅ Checklist de Testes - Responsividade

## 📱 Testes de Dispositivo

### iPhone SE (375px) - Mobile Pequeno

- [ ] Texto principal legível
- [ ] Inputs com padding confortável
- [ ] Botão full-width e facilmente clicável
- [ ] Nenhum overflow horizontal
- [ ] Imagens carregam
- [ ] Menu/navegação visível

### iPhone 12/13 (390px) - Mobile Médio

- [ ] Layout fluido
- [ ] Card padding apropriado
- [ ] Buttons com 44px mínimo
- [ ] Sem zoom necessário

### iPhone 14 Pro (430px) - Mobile Grande

- [ ] Dynamic Island respeitada
- [ ] Safe area implementada
- [ ] Conforto de toque

### iPad (768px) - Tablet

- [ ] Layout otimizado para landscape
- [ ] Espaçamento confortável
- [ ] Card não muito grande nem pequeno
- [ ] Orientação portrait e landscape

### iPad Pro (1024px) - Tablet Grande

- [ ] Botões com espaçamento adequado
- [ ] Form não muito estreito

### Desktop (1920px+) - Tela Grande

- [ ] Card não ultrapassa 600px
- [ ] Espaçamento lateral simétrico
- [ ] Hover effects funcionam
- [ ] Animações suaves

---

## 🌐 Testes de Browser

### Chrome/Edge (Chromium)

- [ ] Layout renderiza corretamente
- [ ] Animações suaves
- [ ] DevTools responsivo funciona
- [ ] Nenhum erro no console

### Firefox

- [ ] Layout ok
- [ ] Colors render corretas
- [ ] Inputs funcionam
- [ ] Select dropdown abre

### Safari (macOS)

- [ ] Gradients renderizam
- [ ] Animações funcionam
- [ ] Focus state visível

### Safari (iOS)

- [ ] Inputs não fazem zoom
- [ ] Safe area respeitada
- [ ] Notch/dynamic island ok
- [ ] Teclado não quebra layout

---

## 📐 Testes de Responsividade

### Tipografia

- [ ] Título legível sem zoom em mobile
- [ ] Paragráfo confortável de ler
- [ ] Labels bem dimensionados
- [ ] Hints auxiliares visíveis

### Layout

- [ ] Sem overflow horizontal
- [ ] Container centralizado
- [ ] Card com espaçamento adequado
- [ ] Footer visível ao final

### Espacejamento

- [ ] Gap entre campos apropriado
- [ ] Padding do card fluido
- [ ] Margem de segurança nas bordas
- [ ] Sem elementos "apertados"

### Imagens

- [ ] Album art carrega
- [ ] Aspect ratio mantido (1:1)
- [ ] Sem distorção
- [ ] Lazy loading funciona

---

## 🎨 Testes de Design

### Cores

- [ ] Contraste WCAG AA
- [ ] Dark mode automático
- [ ] Accent color visível
- [ ] Text readable

### Botões

- [ ] Mínimo 44×44px
- [ ] Hover state claro
- [ ] Focus state visível
- [ ] Active state feedback
- [ ] Disabled state ok

### Inputs

- [ ] Foco com bordinha/sombra
- [ ] Placeholder visível
- [ ] Valor legível
- [ ] Cursor apropriado

### Alertas

- [ ] Mensagens de erro visíveis
- [ ] Contraste adequado
- [ ] Animação smooth
- [ ] Desaparece após 5s

---

## ⌨️ Testes de Acessibilidade

### Navegação por Teclado

- [ ] Tab funciona entre campos
- [ ] Enter submete form
- [ ] Shift+Tab retrocede
- [ ] Focus order lógica

### Screen Reader

- [ ] Aria labels lidos corretamente
- [ ] Form fields identificáveis
- [ ] Botões têm label
- [ ] Erros anunciados

### Motor de Busca (SEO)

- [ ] Meta tags presentes
- [ ] Heading hierarchy correto
- [ ] Alt text em imagens
- [ ] Schema markup (se aplicável)

### Reduzir Movimento

- [ ] Respeita `prefers-reduced-motion`
- [ ] Sem animações desnecessárias
- [ ] Transições minimais

---

## 🚀 Testes de Performance

### Carregamento

- [ ] CSS carrega <1s
- [ ] Primeira renderização rápida
- [ ] Nenhum FOUC (flash de unstyled content)

### Animações

- [ ] 60 FPS (sem lag)
- [ ] Suave ao scroll
- [ ] Transitions fluidas

### Memory

- [ ] Sem memory leaks
- [ ] DevTools mostra consumo baixo

---

## 🎬 Testes de Interação

### Form

- [ ] Input accepts URL
- [ ] Select options funciona
- [ ] Button submete form
- [ ] Disabled state durante envio

### Validação

- [ ] URL inválida mostra erro
- [ ] Preset obrigatório
- [ ] Mensagem de erro animada

### Estados

- [ ] Loading state visível
- [ ] Success state clear
- [ ] Error state obvious

---

## 📸 Testes de Screenshots

### Mobile Portrait (375px)

```
Testar:
[ ] Cabeçalho completo visível
[ ] Form sem truncar
[ ] Botão clicável
[ ] Footer com suporte safe-area
```

### Mobile Landscape (667×375px)

```
Testar:
[ ] Layout não quebra
[ ] Campos lado a lado? (não, stacked)
[ ] Ainda usável
```

### Tablet (768px)

```
Testar:
[ ] Mais espaço utilizado
[ ] Card ainda responsivo
[ ] Sem excesso de space
```

### Desktop (1920px)

```
Testar:
[ ] Card centrado
[ ] Máximo 600px
[ ] Simétrico
```

---

## 🔍 Validação de CSS

### W3C Validator

```bash
# Nenhum erro CSS
[ ] Valid CSS3
[ ] Sem warnings
```

### CSS Lint

```bash
[ ] Nenhuma propriedade duplicada
[ ] Prefixes adequados
[ ] Performance ok
```

---

## 📊 Testes em Escala

### Viewport Dimensions

```
[ ] 320×568 (iPhone SE)
[ ] 375×667 (iPhone 12)
[ ] 390×844 (iPhone 14)
[ ] 414×896 (iPhone 12 Pro Max)
[ ] 480×800 (Android pequeno)
[ ] 540×960 (Android médio)
[ ] 768×1024 (iPad)
[ ] 1024×768 (iPad landscape)
[ ] 1366×768 (Laptop)
[ ] 1920×1080 (Desktop Full HD)
[ ] 2560×1440 (Desktop 2K)
```

---

## 🌍 Testes de Internacionalização

### Português

- [ ] Textos em PT-BR
- [ ] Acentuação OK
- [ ] RTL não aplicável

### Charset

- [ ] UTF-8 configurado
- [ ] Emojis renderizam (🎵, 🐢, etc)

---

## 🐛 Testes de Debug

### DevTools Console

```javascript
// Executar no console:
[ ] document.documentElement.scrollWidth <= window.innerWidth
    (Sem horizontal scroll)

[ ] getComputedStyle(btn).height
    (> 44px no mobile)

[ ] getComputedStyle(title).fontSize
    (Não fixo, responsivo)
```

### Lighthouse

```
[ ] Performance > 90
[ ] Accessibility > 90
[ ] Best Practices > 90
[ ] SEO > 90
```

---

## ✨ Testes Finais

### Cross-platform

- [ ] iOS Safari
- [ ] iOS Chrome
- [ ] Android Chrome
- [ ] Android Firefox
- [ ] macOS Safari
- [ ] Windows Edge
- [ ] Windows Firefox

### Orientação

- [ ] Portrait mode ok
- [ ] Landscape mode ok
- [ ] Rotação sem quebras

### Conectividade

- [ ] 4G lento (~2Mbps)
- [ ] WiFi (>10Mbps)
- [ ] Offline mode (PWA)

---

## 📋 Checklist Final

### Antes de Deploy

- [ ] Todos os testes passaram
- [ ] Nenhum erro no console
- [ ] Performance ok
- [ ] Acessibilidade validada
- [ ] Screenshots do Lighthouse salvos
- [ ] Device testing completo

### Deploy

- [ ] CSS minificado (opcional)
- [ ] Images otimizadas (opcional)
- [ ] Cache-busting ativo
- [ ] CDN configurado (se houver)

---

## 📞 Suporte Adicional

Se encontrar problemas:

### Layout quebrado?

1. Verificar Media Query aplicável
2. Rodar DevTools responsivo
3. Verificar `max-width` vs `width`

### Texto ilegível?

1. Aumentar `clamp()` min/max
2. Verificar `font-size`
3. Aumentar `line-height`

### Botão pequeno?

1. Aumentar `padding`
2. Verificar `font-size: 16px` no mobile
3. Garantir mínimo 44×44px

### Imagem distorcida?

1. Usar `object-fit: cover`
2. Definir `aspect-ratio`
3. Remover `height` fixa

---

**Boa sorte nos testes! 🚀 A interface está 100% responsiva!**
