// Built once at deploy time into /ddd-2026/api/config.json. No runtime cost.
//
// The kiosk is plain JS served from public/, so it can't import src/data
// itself: anything it needs from there comes through here.
import type { APIRoute } from 'astro';
import kiosk from '../../../data/ddd2026.json';
import forms from '../../../data/forms.json';
import team from '../../../data/team.json';

export const prerender = true;

// "3 October", from the ISO date in ddd2026.json. Pinned to UTC so the build
// machine's timezone can't shift it a day.
const eventDate = new Date(`${kiosk.eventDate}T00:00:00Z`).toLocaleDateString('en-AU', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

export const GET: APIRoute = () =>
  Response.json({
    eventName: kiosk.eventName,
    eventDate,
    idleSeconds: kiosk.idleSeconds,
    attractSeconds: kiosk.attractSeconds,
    onScreenKeyboard: kiosk.onScreenKeyboard,
    game: kiosk.game,
    links: kiosk.links,
    // The "Run by volunteers" card. Names and roles as team.json has them.
    team: team.map(({ name, role }) => ({ name, role })),
    forms: {
      endpoint: forms.sponsor.action,
      accessKey: forms.sponsor.accessKey,
      subjectPrefix: kiosk.formSubjectPrefix,
      fromName: 'Perth AI booth',
    },
  });
