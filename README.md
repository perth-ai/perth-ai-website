# Perth AI website

The website for [Perth AI](https://lu.ma/perthai) — Western Australia's community for people
building with AI.

Static site, no backend, free to host. **Astro 5 + Tailwind 4**, deployed to **Cloudflare Pages**.

## Quick start

```bash
npm install
npm run dev
```

http://localhost:4321

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with live reload |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run check` | Type-check the Astro components |

## Pages

| Route | Source |
| --- | --- |
| `/` | `src/pages/index.astro` — segments, events, summit, other events, team, partners |
| `/events` | Luma calendar, event formats, first-timer guide, cross-promoted events |
| `/about` | Mission, story, vision, values, team |
| `/get-involved` | Speaker call-out, event ideas, venue and support EoIs |
| `/sponsor` | Why sponsor, tiers, enquiry form |
| `/blog` + `/blog/<post>` | Markdown posts from `src/content/blog/` |

## Editing content

Nearly everything is a JSON or markdown file — no code required. Full map in
[CLAUDE.md](CLAUDE.md). The short version:

- **Community details, links, Luma** → `src/data/site.json`
- **Team, sponsors, partners, event types** → the matching file in `src/data/`
- **Mission, vision, values** → `src/data/about.json`
- **Blog posts** → drop a `.md` file into `src/content/blog/`
- **Colours and fonts** → the `@theme` block at the top of `src/styles/global.css`

## Before it goes live

This is a working skeleton — these need real values:

- [ ] **Luma calendar** — put your calendar ID (`cal-…`, from Luma → Calendar → Settings → Embed)
      into `links.lumaEmbedId` in `src/data/site.json`. Events then appear automatically and stay
      current with no further work.
- [ ] **Form endpoints** — `src/data/forms.json` has empty `action` fields, so the EoI forms
      currently fall back to opening the visitor's email client. Wire up Formspree, Tally, Getform
      or a Cloudflare Pages Function before launch.
- [ ] **Mailing list** — either leave it pointing at Luma, or put a form action into
      `mailingList.formAction` in `src/data/site.json`.
- [ ] **Domain** — set `site` in `astro.config.mjs` and the sitemap line in `public/robots.txt`.
- [ ] **Email address** — `hello@perthai.org` in `src/data/site.json` is a placeholder.
- [ ] **Team** — `src/data/team.json` has placeholder entries.
- [ ] **Sponsorship tiers** — the prices in `src/data/sponsors.json` are a starting point, not an
      agreed rate card.
- [ ] **Partner links** — verify the URLs in `src/data/community.json` and confirm with each group
      before describing them as a partner.
- [ ] **Colours** — the sunset/river palette in `src/styles/global.css` is a first cut. Swap the
      hex values there once the identity is settled and the whole site follows.
- [ ] **Summit details** — `summit` in `src/data/site.json` points at the 2025 site.

## Deploying to Cloudflare Pages

1. Push this repo to GitHub under the Perth AI org.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command `npm run build`, output directory `dist`. Framework preset: Astro.
4. Deploy. Every push to `main` publishes; every PR gets its own preview URL.

Free tier covers this comfortably. `public/_headers` sets security headers and caching.

## Automation hooks

Two seams are built in for the autonomous updates in the spec:

- **`src/data/otherEvents.json`** — machine-writable list of AI events run by other groups around
  Perth. Point the existing Slack event scraper at this file and have it open a PR; past events
  drop off automatically at build time.
- **`src/data/*.json` generally** — all content is structured data, so an agent can propose changes
  as a normal PR that a human reviews, rather than editing markup.

## How we work on it

Ship / show / ask — see [CONTRIBUTING.md](CONTRIBUTING.md). Short version: content changes go
straight to `main`, new features get a PR and a review.
