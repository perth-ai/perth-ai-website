// Booth admin API: leaderboard moderation and the prize draw. Every request
// needs the DDD_ADMIN_PIN secret in an x-admin-pin header.
//
// Sign-ups aren't stored, so there's nothing about them here: they go straight
// to the Perth AI inbox through Web3Forms.
import type { APIRoute } from 'astro';
import { checkAdmin, db, ensureSchema, json, player } from '../../../../lib/ddd2026';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const denied = await checkAdmin(request);
  if (denied) return denied;
  await ensureSchema();

  if (params.path === 'summary') {
    const plays = { runner: 0 } as Record<string, number>;
    const { results } = await db().prepare('SELECT game, COUNT(*) AS n FROM scores GROUP BY game').all<{ game: string; n: number }>();
    for (const row of results) plays[row.game] = row.n;
    const drawEntrants = await db()
      .prepare('SELECT COUNT(DISTINCT lower(email)) AS entrants FROM scores WHERE consent = 1')
      .first<number>('entrants');
    return json({ plays, drawEntrants });
  }

  if (params.path === 'scores') {
    // Everything but client_id, which only matters to the kiosk. played_at is when
    // the run ended on the device; created_at is when it reached us.
    const { results } = await db()
      .prepare(
        `SELECT id, game, name, email, consent, updates, score, correct, rounds, hidden, played_at, created_at
         FROM scores ORDER BY score DESC, created_at ASC`
      )
      .all();
    return json(results);
  }

  return json({ error: 'Not found' }, 404);
};

export const POST: APIRoute = async ({ params, request }) => {
  // None of these take a body, but leaving one unread drops the connection in workerd.
  await request.arrayBuffer().catch(() => {});
  const denied = await checkAdmin(request);
  if (denied) return denied;
  await ensureSchema();
  const path = params.path ?? '';

  // Hides every score by that player (the board shows each player's best, so
  // hiding one row would just surface their next one). A player is their email,
  // or their name if they gave no email: see player().
  const hide = path.match(/^scores\/(\d+)\/hide$/);
  if (hide) {
    await db()
      .prepare(`UPDATE scores SET hidden = 1 WHERE ${player()} = (SELECT ${player()} FROM scores WHERE id = ?)`)
      .bind(Number(hide[1]))
      .run();
    return json({ ok: true });
  }

  // Soft reset: hides everything from the public board but keeps the rows for
  // the prize draw. Remembers when, so a run played before now that's still
  // waiting on a device arrives hidden too (see api/scores.ts).
  if (path === 'scores/reset') {
    await db()
      .prepare(
        `INSERT INTO meta (key, value) VALUES ('board_cleared_at', datetime('now', '+8 hours'))
         ON CONFLICT (key) DO UPDATE SET value = excluded.value`
      )
      .run();
    await db().prepare('UPDATE scores SET hidden = 1').run();
    return json({ ok: true });
  }

  // Random draw: one entry per unique email, only people who opted in.
  if (path === 'draw') {
    const winner = await db()
      .prepare(
        `SELECT name, email, MAX(score) AS score FROM scores
         WHERE consent = 1 AND email IS NOT NULL GROUP BY lower(email) ORDER BY random() LIMIT 1`
      )
      .first();
    return json({ winner: winner ?? null });
  }

  return json({ error: 'Not found' }, 404);
};
