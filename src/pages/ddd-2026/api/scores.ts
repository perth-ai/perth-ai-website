// Quokka Run leaderboard for the booth kiosk (/ddd-2026). One row per player on the
// public board; every run is kept for the prize draw and the CSV.
import type { APIRoute } from 'astro';
import { db, ensureSchema, json } from '../../../lib/ddd2026';
// Plain JS shared with the kiosk front end, so both apply the same rules.
import { gameOrDefault, validateScore } from '../../../../public/ddd-2026/js/scoring.js';

export const prerender = false;

// Anyone can POST a score (the kiosk has no login), so these stop a script
// flooding the board, the CSV and the prize draw with thousands of rows. Both
// are far above what a real booth produces: a keen student replaying all day
// gets to 30 or 40 runs, and a run lasts well over ten seconds, so even every
// booth device finishing at once stays under the per-minute cap.
const MAX_RUNS_PER_NAME = 100;
const MAX_RUNS_PER_MINUTE = 60;

// One row per player (their best), so a single visitor can't fill the board.
export const GET: APIRoute = async ({ url }) => {
  await ensureSchema();
  const game = gameOrDefault(url.searchParams.get('game'));
  // Clamped both ways: SQLite reads a negative LIMIT as "no limit".
  const limit = Math.min(50, Math.max(1, Math.round(Number(url.searchParams.get('limit'))) || 10));
  const { results } = await db()
    .prepare(
      `SELECT id, name, score FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY score DESC, id ASC) AS n
         FROM scores WHERE hidden = 0 AND game = ?
       ) WHERE n = 1 ORDER BY score DESC, id ASC LIMIT ?`
    )
    .bind(game, limit)
    .all();
  return json(results);
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => null);
  const { ok, errors, clean } = validateScore(body);
  if (!ok) return json({ errors }, 400);
  const { game, name, email, consent, updates, score, correct, rounds } = clean;

  await ensureSchema();
  // `created_at` is stored in Perth time (see ensureSchema), so the window is too.
  const load = await db()
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM scores WHERE game = ? AND lower(name) = lower(?)) AS byName,
         (SELECT COUNT(*) FROM scores WHERE created_at > datetime('now', '+8 hours', '-1 minute')) AS lastMinute`
    )
    .bind(game, name)
    .first<{ byName: number; lastMinute: number }>();
  if ((load?.lastMinute ?? 0) >= MAX_RUNS_PER_MINUTE) {
    return json({ errors: { _form: 'The board is busy right now. Try saving again in a minute.' } }, 429);
  }
  if ((load?.byName ?? 0) >= MAX_RUNS_PER_NAME) {
    return json({ errors: { _form: `That name has saved ${MAX_RUNS_PER_NAME} runs already. Pick another one.` } }, 429);
  }

  const inserted = await db()
    .prepare('INSERT INTO scores (game, name, email, consent, updates, score, correct, rounds) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(game, name, email, consent, updates, score, correct, rounds)
    .run();

  // Rank the player's best (which may be an earlier run) against everyone else's best.
  const best =
    (await db()
      .prepare('SELECT MAX(score) AS best FROM scores WHERE hidden = 0 AND game = ? AND lower(name) = lower(?)')
      .bind(game, name)
      .first<number>('best')) ?? score;
  const rank = await db()
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM (
         SELECT lower(name) AS who, MAX(score) AS top FROM scores WHERE hidden = 0 AND game = ? GROUP BY who
       ) WHERE top > ? AND who != lower(?)`
    )
    .bind(game, best, name)
    .first<number>('rank');

  return json({ ok: true, id: inserted.meta.last_row_id, rank, best });
};
