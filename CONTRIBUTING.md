# Contributing to the Perth AI website

The site is deliberately simple so that any organiser can change it — with Claude Code, or by hand
in a text editor. This page covers how we work on it together.

## Getting set up

```bash
npm install
npm run dev
```

Open http://localhost:4321. Changes appear as you save.

## Where things live

Almost everything you'd want to change is in `src/data/` (JSON files) or `src/content/blog/`
(markdown). See the table in [CLAUDE.md](CLAUDE.md) for what lives where. You shouldn't need to
touch a `.astro` file to add an event, a sponsor, a team member or a blog post.

## Ship / show / ask

We use [ship / show / ask](https://martinfowler.com/articles/ship-show-ask.html) rather than
requiring review on everything. The point is that low-risk changes shouldn't wait on a volunteer
with a day job.

### Ship — commit straight to `main`

No PR, no review. Push it and move on.

- Fixing typos, broken links, wrong dates
- Updating content within a structure that already exists — team members, sponsor logos, event
  formats, community group listings
- Adding an event to `src/data/otherEvents.json`
- Publishing a blog post that's uncontroversial
- Updating copy on a page you own

### Show — open a PR, merge it, then tell the group

You don't wait for approval, but you make the change visible so people can respond.

- A blog post taking a position, or one that speaks for the community
- Adding or removing a partner organisation
- Rewording the mission, vision or values
- Meaningful new content sections built from existing components
- Changing sponsorship tiers or pricing

Post the merged PR link in the organisers' channel with a line on what changed.

### Ask — open a PR and wait for a review

Someone else needs to look before this lands.

- New pages, new routes, new components
- Design fundamentals — colours, typography, layout system, the logo
- Anything touching the build, dependencies, hosting or deploy config
- Adding client-side JavaScript or a third-party embed
- Anything that collects personal data, or changes where form submissions go
- Anything that costs money

**When in doubt, go one level more cautious.** Nobody has ever been annoyed by an unnecessary PR.

## Git workflow

`main` is always deployable — Cloudflare Pages builds and publishes it on every push.

For show and ask changes:

```bash
git checkout -b your-change
```

Commit, push, open a PR. Cloudflare builds a preview URL for every PR, so you can send people a
link to look at rather than a description.

Keep PRs small. One change per PR is much easier to review than five.

## Before you open a PR

```bash
npm run build
```

If it builds, look at the pages you changed on a phone-width window as well as a wide one. Most
issues in this repo are layouts breaking between 500px and 900px.

## House style

- Australian English — organise, programme, centre
- Direct and warm. No hype, no marketing voice.
- Don't invent details. If you need a real name, price, date or URL you can't verify, leave a
  placeholder and flag it in the PR.
