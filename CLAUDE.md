# Perth AI website — working notes for Claude Code

This repo is set up so anyone in the Perth AI organising group can point Claude Code at it and make
a change safely, without knowing Astro. Read this before editing.

## What this is

A static site built with **Astro 5 + Tailwind 4**, deployed to **Cloudflare Pages**. No database, no
server, no API keys. `npm run build` produces plain HTML in `dist/`.

```bash
npm run dev
```

## The one rule

**Content lives in data files, not in components.** Before editing a `.astro` file, check whether
the thing you want to change is in `src/data/` or `src/content/`. It usually is.

| To change… | Edit… |
| --- | --- |
| Community name, tagline, email, social links, Luma calendar | `src/data/site.json` |
| The three audience segments on the homepage | `src/data/segments.json` |
| Event formats (meet-up, workshop, …) | `src/data/eventTypes.json` |
| Mission, vision, values, origin story, acknowledgement | `src/data/about.json` |
| Organisers on the team lists | `src/data/team.json` |
| Sponsorship tiers and current sponsors | `src/data/sponsors.json` |
| Partner and recommended groups | `src/data/community.json` |
| Cross-promoted events by other groups | `src/data/otherEvents.json` |
| Form endpoints and intro copy | `src/data/forms.json` |
| Blog posts | `src/content/blog/*.md` — one file per post |
| Colours, fonts, spacing tokens | `src/styles/global.css` (the `@theme` block) |
| The logo mark | `src/components/Logo.astro` |

Adding a blog post means adding a markdown file. Adding a team member or sponsor tier means adding
a JSON object. Neither needs a code change, and neither should get one.

## Structure

```
src/
  data/         JSON content — the main editing surface
  content/blog/ Blog posts as markdown, schema in src/content.config.ts
  components/   Reusable pieces (Header, Footer, Section, EoiForm, LumaEmbed…)
  layouts/      Base.astro — the page shell, <head>, header + footer
  pages/        One file per route
  styles/       global.css — design tokens live here
public/         Static files served as-is (favicon, robots.txt, _headers)
```

## Conventions to follow

- **Mobile first.** Write the mobile layout, then add `sm:` / `md:` / `lg:` variants. Don't jump to
  3 columns at `sm:` — text gets crushed on tablets. Use `md:grid-cols-3` at the earliest.
- **Use the tokens.** `sunset-*` (primary accent), `river-*` (secondary), `ink-*` (dark/text),
  `sand-*` (page background). Never hardcode a hex outside `global.css`.
- **Use `<Section>`** for page sections — it handles the max-width, padding, eyebrow/title/lead
  block and the light/muted/dark tones consistently.
- **Zero client JavaScript by default.** The mobile menu is a `<details>` element on purpose. If a
  feature seems to need JS, that's an "ask" (see below) — check whether it really does first.
- **Accessibility isn't optional.** Every image needs alt text, every form field needs a `<label>`,
  focus states stay visible, and heading levels don't skip.
- **Australian English.** "Organise", "programme", "centre". Dates as `en-AU`.

## Voice

Direct, warm, a bit dry. Short sentences. No hype, no "revolutionary", no "leverage", no em-dash
soup. Write like an organiser telling a friend what the community is, not like a landing page.
Assume the reader is capable and busy.

## Don't remove these dependencies

`@emnapi/core` and `@emnapi/runtime` are in `devDependencies` and look like they do nothing. They
are load-bearing. `@tailwindcss/oxide-wasm32-wasi` declares them as bundled dependencies, and npm
won't write lock entries for bundled deps — so `npm ci` fails on Linux with
`Missing: @emnapi/core from lock file`, even though everything works on macOS. Depending on them
directly forces real lock entries and keeps the Cloudflare build green.

Remove them and deploys break while local development stays fine. If Tailwind fixes this upstream,
they can go.

Regenerate the lockfile with npm 10.9.2 (`npx npm@10.9.2 install`) to match Cloudflare's npm —
npm 11 prunes optional platform packages differently and produces a lockfile `npm ci` rejects.

## Things to be careful with

- **Never invent real people, sponsors, or partner organisations.** If content needs a real name,
  a date, a price or a URL you can't verify, leave a clear placeholder and say so in the PR.
- **Don't commit secrets.** There aren't any yet and it should stay that way — form endpoints in
  `forms.json` are public by design, so only use services where a public endpoint is fine.
- **`site` in `astro.config.mjs`** must match the real domain, or canonical URLs go wrong.

## Ship / show / ask

Agreed working model for this repo. Full detail in [CONTRIBUTING.md](CONTRIBUTING.md).

- **Ship** — commit straight to `main`. Typo fixes, content updates within existing structure,
  adding a blog post, adding an event to `otherEvents.json`, updating team or sponsor data.
- **Show** — open a PR, merge it yourself, tell the group after. New content the wider group would
  want to know about: a new blog post on a spicy topic, a new partner listing, reworded mission copy.
- **Ask** — open a PR and wait for a review. New pages or features, design system changes, anything
  touching the build, deploy, dependencies or form handling.

When in doubt, go one level more cautious.

## Before you finish a change

```bash
npm run build
```

If it builds, check the pages you touched at a narrow width as well as wide. Then commit on a
branch and open a PR unless it's clearly a "ship".
