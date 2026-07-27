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
- [ ] **Domain** — attach the custom domain in Cloudflare Pages, then set the `SITE_URL`
      environment variable in the Pages project to that domain. This is also what lifts the
      `noindex` guard, so don't set it until you actually want to be findable.
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

Connect once, in the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**:

| Setting | Value |
| --- | --- |
| Repository | `perth-ai/perth-ai-website` |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Output directory | `dist` |

After that it runs itself. Every push to `main` publishes to the staging URL, and **every pull
request gets its own preview URL** — which is the useful bit for iterating on design with other
people: comment on the PR, push a commit, refresh the preview link.

Node version comes from `.node-version`. Free tier covers all of this. `public/_headers` sets
security headers and cache rules.

### Staging vs production

The site works out which environment it's in and behaves accordingly — you don't configure this
per-deploy:

- **Previews and `*.pages.dev`** send `noindex, nofollow` on every page, so the unfinished site
  can't turn up in Google while you're sharing links around.
- **Production** is any real custom domain. To switch it on, set a `SITE_URL` environment variable
  in the Cloudflare Pages project settings to the live domain (e.g. `https://perthai.org`). That
  removes the `noindex` and fixes canonical URLs in one step.

Canonical and social-share URLs follow the deploy automatically, so a preview link pasted into
Slack unfurls with the right title and description rather than pointing at production.

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
