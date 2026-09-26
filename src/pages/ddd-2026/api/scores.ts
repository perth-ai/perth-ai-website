// Quokka Run leaderboard for the booth kiosk (/ddd-2026). One row per player on the
// public board; every run is kept for the prize draw and the CSV.
import type { APIRoute } from 'astro';
import { db, ensureSchema, json } from '../../../lib/ddd2026';
// Plain JS shared with the kiosk front end, so both apply the same rules.
import { gameOrDefault, validateScore } from '../../../../public/ddd-2026/js/scoring.js';

export const prerender = false;

// One row per player (their best), so a single visitor can't fill the board.
export const GET: APIRoute = async ({ url }) => {
  await ensureSchema();
  const game = gameOrDefault(url.searchParams.get('game'));
  const limit = Math.min(Number(url.searchParams.get('limit')) || 10, 50);
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
