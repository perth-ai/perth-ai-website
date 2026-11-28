# Perth AI website: notes for coding agents

The full working notes live in [CLAUDE.md](CLAUDE.md). They apply to every agent, not just
Claude Code: read that file before editing. The rules below are repeated here because they matter
most.

## Never make things up about real organisations or people

- **Never invent real people, sponsors, or partner organisations.** If content needs a real name,
  a date, a price or a URL you can't verify, leave a clear placeholder and say so in the PR.
- **Never make up a logo or brand identity for another organisation.** Exhibitor, sponsor,
  partner and speaker logos must come from the organisation itself: a file they sent us, or the
  file as published on their own website or official profile. Don't draw, trace, recreate,
  recolour or "tidy up" a logo, and don't invent brand colours, taglines or wordmarks for them.
  Resizing or converting the format (to webp, say) is fine; changing what it looks like isn't. If
  there's no logo, use the neutral `partner-name` tile on the expo page (their name in our own
  font on navy) and ask them for one. In the commit message, say where each logo came from.

## The rest

Content lives in `src/data/` and `src/content/`, not in components. Run `npm run build` before
you finish. Follow the ship / show / ask model in [CONTRIBUTING.md](CONTRIBUTING.md). Everything
else is in [CLAUDE.md](CLAUDE.md).
