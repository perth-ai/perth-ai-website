// Quokka Run prizes for the DDD Perth 2026 booth kiosk. See docs/ddd-2026.md.
//
// Two kinds: random draws (choc quokkas, a couple at a time, whenever the team
// likes) and the top-score prize. Admin starts either; the booth screen then
// shows it (the wheel spins on the booth screen, see public/ddd-2026/js/draw.js).
//
// The rules, agreed with the organisers:
// - In the draw: anyone who saved a run since the board was last cleared (so,
//   on the day) and left an email or a mobile to be contacted.
// - One entry per player, however many runs (a player is player()).
// - Nobody wins twice, including the top-score winner and anyone whose prize
//   went to a redraw. Admin's Hide takes a player out of the draw too.
// - Clearing the board starts a fresh draw: winners from before then (a
//   rehearsal) don't count.
import { CLEARED_AT, db, player } from './ddd2026';

// Leaderboard names on the booth screen's wheel. More than this and the
// slices get too thin to read, so a big draw shows the winners among a random
// sample: the screen is the theatre, the pick happens here.
const WHEEL_NAMES = 24;

export interface Entrant {
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  score: number;
}

// Everyone who can still win, one row each, with their latest name and contact
// details and their best score since the clear.
export async function entrants(): Promise<Entrant[]> {
  const { results } = await db()
    .prepare(
      `SELECT key, name, email, phone, best AS score FROM (
         SELECT ${player()} AS key, name, email, phone,
                MAX(score) OVER (PARTITION BY ${player()}) AS best,
                ROW_NUMBER() OVER (PARTITION BY ${player()} ORDER BY id DESC) AS n
         FROM scores
         WHERE consent = 1 AND removed = 0 AND COALESCE(played_at, created_at) >= ${CLEARED_AT}
       )
       WHERE n = 1 AND key NOT IN (SELECT player FROM winners WHERE created_at >= ${CLEARED_AT})`
    )
    .all<Entrant>();
  return results;
}

// Unbiased random index below n, from the Worker's cryptographic generator.
function randomBelow(n: number) {
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % n;
}

function shuffle<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomBelow(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function record(kind: 'draw' | 'top', names: string[], winners: Entrant[]) {
  const drawId = (await db().prepare('INSERT INTO draws (kind, names) VALUES (?, ?)').bind(kind, JSON.stringify(names)).run())
    .meta.last_row_id;
  for (const w of winners) {
    await db()
      .prepare('INSERT INTO winners (draw_id, prize, player, name, email, phone, score) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(drawId, kind, w.key, w.name, w.email, w.phone, w.score)
      .run();
  }
  return drawId;
}

// Draws up to `count` winners. Returns null when nobody is left to draw.
export async function draw(count: number) {
  const pool = await entrants();
  if (!pool.length) return null;
  const mixed = shuffle(pool);
  const winners = mixed.slice(0, Math.min(count, mixed.length));
  const others = mixed.slice(winners.length, Math.max(WHEEL_NAMES, winners.length));
  const names = shuffle([...winners, ...others]).map((e) => e.name);
  const drawId = await record('draw', names, winners);
  return { drawId, winners, entrants: pool.length };
}

// The top-score prize goes to whoever is #1 on the public board now. Once
// only: returns the existing winner if it's already been given out.
export async function awardTop() {
  const already = await db()
    .prepare(`SELECT name, score FROM winners WHERE prize = 'top' AND created_at >= ${CLEARED_AT}`)
    .first<{ name: string; score: number }>();
  if (already) return { already };
  const top = await db()
    .prepare(
      `SELECT ${player()} AS key, name, email, phone, score FROM scores
       WHERE hidden = 0 AND removed = 0 ORDER BY score DESC, id ASC LIMIT 1`
    )
    .first<Entrant>();
  if (!top) return { none: true };
  // Their latest contact details, which may be on a different run.
  const contact = await db()
    .prepare(`SELECT email, phone FROM scores WHERE ${player()} = ? AND (email IS NOT NULL OR phone IS NOT NULL) ORDER BY id DESC LIMIT 1`)
    .bind(top.key)
    .first<{ email: string | null; phone: string | null }>();
  const winner = { ...top, ...(contact ?? {}) };
  const drawId = await record('top', [winner.name], [winner]);
  return { drawId, winner };
}

// Admin's list: everyone who's won since the board was cleared.
export async function winnersSinceClear() {
  const { results } = await db()
    .prepare(
      `SELECT id, draw_id, prize, name, email, phone, score, status, created_at
       FROM winners WHERE created_at >= ${CLEARED_AT} ORDER BY id`
    )
    .all();
  return results;
}

// Marks a winner who hasn't collected yet as collected, or forfeits their
// prize (draws only: the top-score prize isn't redrawn). True if it changed
// anything, so pressing Redraw twice can't draw two replacements.
export async function setStatus(id: number, status: 'collected' | 'forfeit') {
  const onlyDraws = status === 'forfeit' ? ` AND prize = 'draw'` : '';
  const { meta } = await db()
    .prepare(`UPDATE winners SET status = ? WHERE id = ? AND status = 'drawn'${onlyDraws}`)
    .bind(status, id)
    .run();
  return meta.changes > 0;
}

// What the booth screen shows: the latest draw, names only (never contact details).
export async function latestDraw() {
  // Its age comes from the database clock, so a booth device with its clock
  // wrong can still tell a fresh draw from an old one.
  const row = await db()
    .prepare(
      `SELECT id, kind, names, created_at,
         CAST((julianday(datetime('now', '+8 hours')) - julianday(created_at)) * 86400 AS INTEGER) AS age
       FROM draws ORDER BY id DESC LIMIT 1`
    )
    .first<{ id: number; kind: string; names: string; created_at: string; age: number }>();
  if (!row) return null;
  const { results } = await db()
    .prepare('SELECT name, score FROM winners WHERE draw_id = ? ORDER BY id')
    .bind(row.id)
    .all<{ name: string; score: number }>();
  return { id: row.id, kind: row.kind, names: JSON.parse(row.names) as string[], winners: results, ageSeconds: row.age };
}
