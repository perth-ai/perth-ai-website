# Perth AI Branding Pack

Official branding assets received from the Perth AI design team. These are the source of truth for
all visual identity on the site.

## Contents

```
Perth AI Branding/
  Perth AI - Style Guide.pdf          ← colours, typography, spacing rules
  Logos/
    Main Logo - Perth AI.png           ← primary logo (colour, on dark/light)
    Secondary Logo.png                 ← stacked variant
    Horizontal Secondary Logo.png      ← wide/inline variant
    Mono Logo - Perth AI.png           ← single-colour on dark
    Monogram Logo - Perth AI.png       ← icon-only mark
    BlackandWhite Logo - Perth AI.png  ← print / mono fallback
  Brand Element/
    Pixel Art Perth Background.png     ← decorative background asset
```

## How to use these assets

- **Style guide PDF** — read this first before touching colours, fonts, or logo placement. It
  defines the full palette, typeface, spacing system, and clear-space rules.
- **Logos** — the site logo lives in `src/components/Logo.astro`. Replace the SVG/image source
  there; do not duplicate logo files into `public/` unless a specific use (e.g. open-graph image)
  requires it.
- **Colour tokens** — the `@theme` block in `src/styles/global.css` holds the design tokens.
  Update hex values there; the whole site follows automatically. See CLAUDE.md for contrast rules.
- **Pixel art background** — a decorative asset. If used on the site, copy into `public/` and
  reference via a standard `<img>` or CSS `background-image`.

## Related

- `src/styles/global.css` — `@theme` block (colour tokens)
- `src/components/Logo.astro` — site logo component
- GitHub issue: #8 — Apply new Perth AI branding pack
