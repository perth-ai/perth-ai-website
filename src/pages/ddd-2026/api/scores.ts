// Quokka Run leaderboard for the booth kiosk (/ddd-2026). One row per player on the
// public board (see player()); every run is kept for the prize draw and the CSV.
import type { APIRoute } from 'astro';
import { db, ensureSchema, json, perthTime, player } from '../../../lib/ddd2026';
// Plain JS shared with the kiosk front end, so both apply the same rules.
import { gameOrDefault, validateScore } from '../../../../public/ddd-2026/js/scoring.js';

export const prerender = false;

// Anyone can POST a score (the kiosk has no login), so these stop a script
// flooding the board, the CSV and the prize draw with thousands of rows. Both
// are far above what a real booth produces: a keen student replaying all day
// gets to 30 or 40 runs. The per-minute cap leaves room for every booth device
// sending a backlog at once after a wifi drop (each sends at most 10 a minute).
const MAX_RUNS_PER_PLAYER = 100;
const MAX_RUNS_PER_MINUTE = 120;

// One row per player (their best), so a single visitor can't fill the board.
export const GET: APIRoute = async ({ url }) => {
  await ensureSchema();
  const game = gameOrDefault(url.searchParams.get('game'));
  // Clamped both ways: SQLite reads a negative LIMIT as "no limit".
  const limit = Math.min(50, Math.max(1, Math.round(Number(url.searchParams.get('limit'))) || 10));
  const { results } = await db()
    .prepare(
      `SELECT id, name, score FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY ${player()} ORDER BY score DESC, id ASC) AS n
         FROM scores WHERE hidden = 0 AND game = ?
       ) WHERE n = 1 ORDER BY score DESC, id ASC LIMIT ?`
    )
    .bind(game, limit)
    .all();
  return json(results);
};

// The kiosk saves a score on the device first and sends it until it gets a
// clear answer (scoreboard.js), so a POST can arrive more than once, and late.
// `retry: true` tells it to keep the score and try again; anything else is final.
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const { ok, errors, clean } = validateScore(body);
  if (!ok) return json({ errors }, 400);
  const { game, name, email, consent, updates, score, correct, rounds, clientId, playedAt } = clean;

  await ensureSchema();

  // Already saved (the answer to an earlier send never reached the kiosk)? Say so again.
  const existing = clientId
    ? await db().prepare('SELECT id FROM scores WHERE client_id = ?').bind(clientId).first<number>('id')
    : null;
  if (existing) return json({ ok: true, id: existing, ...(await standing(game, email, name)) });

  // `created_at` is stored in Perth time (see ensureSchema), so the window is too.
  const load = await db()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM scores WHERE game = ? AND ${player()} = ${player('?', '?')}) AS byPlayer,
         (SELECT COUNT(*) FROM scores WHERE created_at > datetime('now', '+8 hours', '-1 minute')) AS lastMinute`
    )
    .bind(game, email, name)
    .first<{ byPlayer: number; lastMinute: number }>();
  if ((load?.lastMinute ?? 0) >= MAX_RUNS_PER_MINUTE) {
    return json({ errors: { _form: 'The board is busy right now. Try saving again in a minute.' }, retry: true }, 503);
  }
  if ((load?.byPlayer ?? 0) >= MAX_RUNS_PER_PLAYER) {
    return json({ errors: { _form: `You’ve saved ${MAX_RUNS_PER_PLAYER} runs already. That’s the limit, sorry.` } }, 429);
  }

  // A run played before the public board was last cleared (it waited out a
  // wifi drop on a device) belongs to the old board, so it arrives hidden.
  const played = playedAt === null ? null : perthTime(playedAt);
  const inserted = await db()
    .prepare(
      `INSERT INTO scores (game, name, email, consent, updates, score, correct, rounds, client_id, played_at, hidden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
         COALESCE((SELECT ? < value FROM meta WHERE key = 'board_cleared_at'), 0))
       ON CONFLICT (client_id) DO NOTHING`
    )
    .bind(game, name, email, consent, updates, score, correct, rounds, clientId, played, played)
    .run();
  // Lost a race with a resend of the same run: report the row that won.
  const id = clientId
    ? await db().prepare('SELECT id FROM scores WHERE client_id = ?').bind(clientId).first<number>('id')
    : inserted.meta.last_row_id;

  return json({ ok: true, id, ...(await standing(game, email, name)) });
};

// Where the player stands: their best visible run (which may be an earlier
// one), its id so the kiosk can highlight their row, and its rank against
// everyone else's best. All null if none of their runs are on the board (a
// late run from before it was cleared, or a player admin has hidden).
async function standing(game: string, email: string | null, name: string) {
  const me = player('?', '?');
  const best = await db()
    .prepare(`SELECT id, score FROM scores WHERE hidden = 0 AND game = ? AND ${player()} = ${me} ORDER BY score DESC, id ASC LIMIT 1`)
    .bind(game, email, name)
    .first<{ id: number; score: number }>();
  if (!best) return { rank: null, best: null, bestId: null };
  const top = best.score;
  const rank = await db()
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM (
         SELECT ${player()} AS who, MAX(score) AS top FROM scores WHERE hidden = 0 AND game = ? GROUP BY who
       ) WHERE top > ? AND who != ${me}`
    )
    .bind(game, top, email, name)
    .first<number>('rank');
  return { rank, best: top, bestId: best.id };
}
