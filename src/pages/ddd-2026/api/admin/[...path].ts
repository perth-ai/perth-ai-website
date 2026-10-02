// Booth admin API: leaderboard moderation and the prizes. Every request needs
// the DDD_ADMIN_PIN secret in an x-admin-pin header.
//
// Sign-ups aren't stored, so there's nothing about them here: they go straight
// to the Perth AI inbox through Web3Forms.
import type { APIRoute } from 'astro';
import kiosk from '../../../../data/ddd2026.json';
import { checkAdmin, db, ensureSchema, json, player } from '../../../../lib/ddd2026';
import { awardTop, draw, entrants, setStatus, winnersSinceClear } from '../../../../lib/ddd2026-prizes';

export const prerender = false;

// How many winners one press of "Draw" can pick.
const MAX_PER_DRAW = 6;

export const GET: APIRoute = async ({ params, request }) => {
  const denied = await checkAdmin(request);
  if (denied) return denied;
  await ensureSchema();

  if (params.path === 'summary') {
    const plays = { runner: 0 } as Record<string, number>;
    const { results } = await db().prepare('SELECT game, COUNT(*) AS n FROM scores GROUP BY game').all<{ game: string; n: number }>();
    for (const row of results) plays[row.game] = row.n;
    const winners = (await winnersSinceClear()) as { prize: string; status: string }[];
    const given = winners.filter((w) => w.prize === 'draw' && w.status !== 'forfeit').length;
    return json({
      plays,
      drawEntrants: (await entrants()).length,
      prizes: { given, total: kiosk.game.drawPrizes ?? null, label: kiosk.game.drawPrize ?? 'a prize' },
    });
  }

  if (params.path === 'scores') {
    // Everything but client_id, which only matters to the kiosk. played_at is when
    // the run ended on the device; created_at is when it reached us.
    const { results } = await db()
      .prepare(
        `SELECT id, game, name, email, phone, consent, updates, score, correct, rounds, hidden, removed, played_at, created_at
         FROM scores ORDER BY score DESC, created_at ASC`
      )
      .all();
    return json(results);
  }

  if (params.path === 'winners') return json(await winnersSinceClear());

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
  // hiding one row would just surface their next one), and takes them out of
  // the prize draw. New runs by them arrive hidden too. See player().
  const hide = path.match(/^scores\/(\d+)\/hide$/);
  if (hide) {
    await db()
      .prepare(`UPDATE scores SET hidden = 1, removed = 1 WHERE ${player()} = (SELECT ${player()} FROM scores WHERE id = ?)`)
      .bind(Number(hide[1]))
      .run();
    return json({ ok: true });
  }

  // Soft reset: hides everything from the public board but keeps the rows for
  // the CSV. Remembers when, so a run played before now that's still waiting
  // on a device arrives hidden too (see api/scores.ts), and so the prize draw
  // starts afresh from here (see lib/ddd2026-prizes.ts).
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

  // Draws 1–6 winners; the booth screen spins the wheel for them.
  const drawCount = path.match(/^draw\/(\d+)$/);
  if (drawCount) {
    const count = Math.min(MAX_PER_DRAW, Math.max(1, Number(drawCount[1])));
    const result = await draw(count);
    if (!result) return json({ error: 'Nobody left to draw: everyone in the draw has already won.' }, 409);
    return json(result);
  }

  if (path === 'top') {
    const result = await awardTop();
    if ('already' in result) return json({ error: `The top-score prize already went to ${result.already!.name}.` }, 409);
    if ('none' in result) return json({ error: 'There are no scores on the board yet.' }, 409);
    return json(result);
  }

  const winner = path.match(/^winners\/(\d+)\/(collected|redraw)$/);
  if (winner) {
    const id = Number(winner[1]);
    if (winner[2] === 'collected') {
      await setStatus(id, 'collected');
      return json({ ok: true });
    }
    // Not collected in time: their prize goes back in, and one more is drawn.
    if (!(await setStatus(id, 'forfeit'))) return json({ error: 'That prize has already been collected or redrawn.' }, 409);
    const result = await draw(1);
    if (!result) return json({ error: 'Nobody left to draw: everyone in the draw has already won.' }, 409);
    return json(result);
  }

  return json({ error: 'Not found' }, 404);
};
