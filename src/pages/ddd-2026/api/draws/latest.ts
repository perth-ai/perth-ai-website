// The latest prize draw, for the booth screen to spin the wheel for (see
// public/ddd-2026/js/draw.js). Leaderboard names only, which are on the public
// board anyway; contact details stay in admin.
import type { APIRoute } from 'astro';
import { ensureSchema, json } from '../../../../lib/ddd2026';
import { latestDraw } from '../../../../lib/ddd2026-prizes';

export const prerender = false;

export const GET: APIRoute = async () => {
  await ensureSchema();
  return json(await latestDraw());
};
