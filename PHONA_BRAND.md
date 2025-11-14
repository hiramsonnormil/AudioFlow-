# phona – Visual Identity & Brand System

A modern, minimal audio–centric identity. "phona" is always written in lowercase (monosyllabic feel, frictionless). The brand evokes clarity, precision and fluid sonic transformation.

---

## 1. Core Principles

- Lean & calm: dark surfaces, subtle glass translucency, generous negative space.
- Sonic motion: gradients + soft glow hint at wave energy, never harsh neon.
- Accessibility: Maintain WCAG AA contrast for all functional UI text.
- Scalability: Tokenized design (CSS variables / Tailwind extend) for quick theming.

---

## 2. Naming & Typography

| Element                  | Usage               | Font                     | Weight  | Notes                            |
| ------------------------ | ------------------- | ------------------------ | ------- | -------------------------------- |
| Display / Brand wordmark | Headline / nav      | Satoshi (fallback Inter) | 600–700 | Tight letter-spacing `-0.02em`   |
| UI Body                  | Paragraph, labels   | Inter                    | 400–500 | Readability & system familiarity |
| Emphasis / Numbers       | Stats, hero metrics | Satoshi or Inter         | 600–700 | Use gradient text sparingly      |

Fallback stack: `"Satoshi","Inter","system-ui","Segoe UI","Roboto","Helvetica Neue",Arial,sans-serif`.

Font sizing (fluid ramp):

```
--fs-xs: clamp(0.72rem, 0.66rem + 0.25vw, 0.78rem);
--fs-sm: clamp(0.82rem, 0.74rem + 0.35vw, 0.92rem);
--fs-base: clamp(0.95rem, 0.9rem + 0.4vw, 1.05rem);
--fs-lg: clamp(1.15rem, 1.05rem + 0.6vw, 1.35rem);
--fs-xl: clamp(1.55rem, 1.3rem + 1.4vw, 2.2rem);
--fs-2xl: clamp(2.1rem, 1.6rem + 2.2vw, 3.2rem);
--fs-3xl: clamp(2.8rem, 2.2rem + 3vw, 4.2rem);
```

---

## 3. Color System

Primary gradient drives brand energy: violet → cyan (sonic sweep). Provide neutral dark surfaces with layered depth.

| Token             | HSL          | Hex     | Usage                          |
| ----------------- | ------------ | ------- | ------------------------------ |
| `--color-violet`  | 255 100% 69% | #7B61FF | Gradient start, focus ring alt |
| `--color-cyan`    | 191 100% 50% | #00E0FF | Gradient end, accents          |
| `--color-bg`      | 222 40% 4%   | #06070A | App background                 |
| `--color-panel`   | 222 40% 8%   | #10131A | Elevated glass base            |
| `--color-surface` | 222 40% 11%  | #161B24 | Cards, inputs                  |
| `--color-text`    | 220 15% 92%  | #E7EAF0 | Primary text                   |
| `--color-muted`   | 220 10% 65%  | #96A0AF | Secondary text                 |
| `--color-ok`      | 150 70% 45%  | #20C978 | Success                        |
| `--color-warn`    | 40 95% 55%   | #FFC13A | Warnings                       |
| `--color-danger`  | 0 85% 60%    | #FF4D4D | Errors                         |

Gradient utility:

```
--grad-brand: linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)));
```

Glass layering (alpha suggestions):
| Layer | Fill | Border | Shadow |
|-------|------|--------|--------|
| Base panel | hsla(var(--panel) / .60) | 1px solid hsla(var(--text) / .06) | 0 4px 16px -2px hsla(0 0% 0% / .45) |
| Hover panel | hsla(var(--panel) / .72) | 1px solid hsla(var(--text) / .10) | 0 6px 24px -2px hsla(0 0% 0% / .55) |

Accessible contrast target: min 4.5:1 body, 3:1 large / non-critical.

---

## 4. CSS Token Block

```
:root {
  --violet: 255 100% 69%;
  --cyan: 191 100% 50%;
  --bg: 222 40% 4%;
  --panel: 222 40% 8%;
  --surface: 222 40% 11%;
  --text: 220 15% 92%;
  --muted: 220 10% 65%;
  --ok: 150 70% 45%;
  --warn: 40 95% 55%;
  --danger: 0 85% 60%;
  --radius-sm: 8px;
  --radius: 20px;
  --radius-lg: 30px;
  --shadow-sm: 0 2px 6px -1px hsl(222 50% 2% / .6);
  --shadow: 0 8px 24px -4px hsl(222 60% 2% / .55), 0 2px 6px hsl(0 0% 0% / .4);
  --ring: 0 0 0 3px hsla(var(--violet) / .35);
  --focus-ring: 0 0 0 4px hsla(var(--cyan) / .35);
  --grad-brand: linear-gradient(135deg, hsl(var(--violet)), hsl(var(--cyan)));
}
.btn-brand { background: var(--grad-brand); color:#fff; box-shadow:0 4px 18px -2px hsla(var(--violet)/.45); }
.btn-brand:hover { filter:brightness(1.06); }
.text-gradient { background: var(--grad-brand); -webkit-background-clip:text; color:transparent; }
```

---

## 5. Logo & Icon

### Wordmark

- Set in Satoshi 600/700, lowercase `phona`.
- Tracking: `-0.02em`.
- Gradient text allowed in hero only; elsewhere solid neutral (`#fff` or `hsl(var(--text))`).

### Favicon / App Icon

`/public/favicon.svg` implemented:

- Squircle (rounded 14) dark fill.
- Gradient stroke (violet -> cyan).
- Center stylized waveform path (organic cubic + smooth sequence) with subtle glow.
- Works at 16px (simplified – stroke still legible) and scales to 512px.

Safe Clear Space: 0.5 × icon width (32px icon ⇒ 16px padding) around in composite placements.

Monochrome Variant: Use solid `#7B61FF` path on transparent or light neutral background for single-color contexts.

---

## 6. Motion Guidelines

- Waveform / bars: durations 0.8–1.4s ease-in-out alternating.
- Entrance (fade + slight rise 24–32px) once. Avoid repeated bounces.
- Reduced motion: Disable transforms > 10px and any infinite keyframes unless essential (respect `prefers-reduced-motion`).

---

## 7. Tailwind Extension Snippet

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        phona: {
          violet: "#7B61FF",
          cyan: "#00E0FF",
          bg: "#06070A",
          panel: "#10131A",
          surface: "#161B24",
        },
      },
      fontFamily: {
        display: ["Satoshi", "Inter", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { phona: "20px", "phona-lg": "30px" },
      boxShadow: {
        panel: "0 8px 24px -4px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.4)",
      },
    },
  },
};
```

Usage examples:

```
<button class="px-5 py-3 rounded-phona font-medium text-white shadow-panel bg-gradient-to-r from-[#7B61FF] to-[#00E0FF]">Process audio</button>
<span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7B61FF] to-[#00E0FF] font-display font-semibold">phona</span>
```

---

## 8. Accessibility & Contrast

| Element                  | Min Contrast                   | Strategy                                        |
| ------------------------ | ------------------------------ | ----------------------------------------------- |
| Primary text on bg/panel | 7:1 target (AA large margin)   | Off‑white on near-black                         |
| Muted text               | ≥4.5:1                         | Slightly lighter than WCAG min to avoid washout |
| Buttons (gradient)       | Perceivable shape + focus ring | Add focus ring + active state dim               |

Focus State: Combine gradient outline or subtle cyan outer-glow ring.

---

## 9. Tone & Copy Guidelines

- Voice: concise, confident, builder-friendly.
- Avoid hype superlatives; focus on tangible speed & quality.
- Use verbs: "Transform", "Preview", "Export".

CTA Patterns: `Try free`, `Process audio`, `Batch convert`, `Preview result`.

---

## 10. Future Extensions

- Light Theme: Invert surfaces (bg ~#F6F7FA) retain gradient brand.
- Adaptive Icon: Animated wave path for PWA (SMIL or CSS mask) with reduced-motion fallback.
- Stroke-based logotype for outline version (laser engrave / merch).

---

© 2025 phona. All rights reserved.
