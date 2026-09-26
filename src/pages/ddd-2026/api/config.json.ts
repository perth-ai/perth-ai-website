// Built once at deploy time into /ddd-2026/api/config.json. No runtime cost.
import type { APIRoute } from 'astro';
import kiosk from '../../../data/ddd2026.json';
import forms from '../../../data/forms.json';

export const prerender = true;

export const GET: APIRoute = () =>
  Response.json({
    eventName: kiosk.eventName,
    idleSeconds: kiosk.idleSeconds,
    attractSeconds: kiosk.attractSeconds,
    onScreenKeyboard: kiosk.onScreenKeyboard,
    game: kiosk.game,
    links: kiosk.links,
    forms: {
      endpoint: forms.sponsor.action,
      accessKey: forms.sponsor.accessKey,
      subjectPrefix: kiosk.formSubjectPrefix,
      fromName: 'Perth AI booth',
    },
  });
