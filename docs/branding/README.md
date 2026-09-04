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

## What has been applied

The pack is live on the site as of the `feature/new-branding` work:

| Asset | Where it ended up |
| --- | --- |
| Style guide palette | `src/styles/global.css` — each family's `-500` is the guide hex |
| Space Grotesk + Inter | self-hosted via `@fontsource-variable/*`, imported in `global.css` |
| Secondary Logo (quokka circle) | cropped to `public/perth-ai-mark.webp`, used in `Logo.astro` |
| Main Logo | `public/og-perth-ai.jpg` — the 1200×630 Open Graph card |
| Pixel Art Perth Background | `public/perth-skyline.webp` — homepage hero only |

The header lockup is rebuilt in `Logo.astro` as the mark plus live text rather than using
`Horizontal Secondary Logo.png`, because that file is a flat PNG with a baked white background
and cannot sit on the navy header. **If the designers supply vector (SVG) versions — and a
transparent horizontal lockup — swap them in; both are one-line changes.**

## Related

- `src/styles/global.css` — `@theme` block (colour tokens)
- `src/components/Logo.astro` — site logo component
- GitHub issue: #8 — Apply new Perth AI branding pack
