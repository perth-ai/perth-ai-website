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
| Horizontal Secondary Logo - White Cyan Transparent | `public/perth-ai-lockup.webp` — `Logo.astro`'s `lockup` variant |
| Secondary Logo (quokka circle) | cropped to `public/perth-ai-mark.webp` — the header and footer mark, plus favicons |
| Main Logo | `public/og-perth-ai.jpg` — the 1200×630 Open Graph card |
| Pixel Art Perth Background | `public/perth-skyline.webp` — homepage hero only |

The designers supplied transparent versions of the horizontal lockup, so
`Logo.astro` has a `lockup` variant that uses the real artwork. The header and
footer do **not** use it: the dark-background lockup renders the quokka as a
line-art outline rather than the full-colour mascot, which reads as much less
distinctive at 36px. They pair the full-colour mark with live "PERTH AI" text
in Space Grotesk instead.

All the web artwork is the white-on-dark colourway and only works on the navy.
For a light background use the Mono or BlackandWhite logo rather than
recolouring these.

Still wanted from the designers:

- **Vector (SVG) versions** of the marks — would sharpen the favicon, which is
  currently a downscaled raster, and allow recolouring.
- **A dark-background horizontal lockup that keeps the full-colour quokka.**
  The supplied dark version substitutes a line-art outline. With that, the
  header could use the real lockup and its pixel letterforms.

## Related

- `src/styles/global.css` — `@theme` block (colour tokens)
- `src/components/Logo.astro` — site logo component
- GitHub issue: #8 — Apply new Perth AI branding pack
