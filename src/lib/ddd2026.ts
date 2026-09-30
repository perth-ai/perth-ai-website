// Server side of the DDD Perth 2026 booth kiosk (/ddd-2026). See docs/ddd-2026.md.
//
// The only thing stored is Quokka Run scores, in the D1 database bound as
// DDD_2026_DB. Sign-ups never touch this: they go straight from the kiosk to
// Web3Forms, like every other form on the site. A score's email (if any) is
// its prize-draw entry (`consent`); `updates` is whether they also opted in to
// event emails.

// @ts-ignore: typed only once `npm run cf-typegen` has been run, which this repo doesn't require.
import { env } from 'cloudflare:workers';

// Just the parts of Cloudflare's D1 and Web Crypto types used here, so
// `npm run check` passes without generated Worker types.
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  run(): Promise<{ meta: { last_row_id: number } }>;
}

interface KioskEnv {
  DDD_2026_DB: { prepare(sql: string): D1Statement };
  DDD_ADMIN_PIN?: string;
}

const subtle = crypto.subtle as SubtleCrypto & { timingSafeEqual(a: ArrayBuffer, b: ArrayBuffer): boolean };

const kioskEnv = env as unknown as KioskEnv;

export const db = () => kioskEnv.DDD_2026_DB;

// One leaderboard entry per player. A player is their email when they gave
// one, so two different Sams stay two entries; without an email, the name is
// all there is. The name key has a space in it, which no email can, so the
// two kinds never collide. player() is a row's columns; player('?', '?') takes
// an email and a name as parameters, in that order.
export const player = (email = 'email', name = 'name') => `COALESCE(lower(${email}), 'name ' || lower(${name}))`;

// Columns added after the table first shipped. CREATE TABLE IF NOT EXISTS
// won't add them to a database that already exists, so each gets an ALTER
// TABLE, which fails harmlessly once the column is there.
//   client_id  the kiosk's id for a run, so a resent save is never counted twice
//   played_at  when the run ended on the device (Perth time), which can be well
//              before created_at if it waited out a wifi drop
const ADDED_COLUMNS = ['client_id TEXT', 'played_at TEXT'];

// Creates or updates the tables the first time each worker instance touches
// the database, so there's no migration step to remember on deploy. A new
// column goes in ADDED_COLUMNS above, never only in the CREATE TABLE.
let ready: Promise<unknown> | undefined;
export function ensureSchema() {
  ready ??= migrate()
    // Forget a failed attempt so the next request tries again rather than
    // failing forever on a stale rejection.
    .catch((err: unknown) => {
      ready = undefined;
      throw err;
    });
  return ready;
}

async function migrate() {
  await db()
    .prepare(
      `CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game TEXT NOT NULL DEFAULT 'runner',
        name TEXT NOT NULL,
        email TEXT,
        consent INTEGER NOT NULL DEFAULT 0,
        score INTEGER NOT NULL,
        correct INTEGER NOT NULL,
        rounds INTEGER NOT NULL,
        hidden INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
        updates INTEGER NOT NULL DEFAULT 0
      )`
    )
    .run();
  for (const column of ADDED_COLUMNS) {
    try {
      await db().prepare(`ALTER TABLE scores ADD COLUMN ${column}`).run();
    } catch (err) {
      // Already there (or another worker instance added it a moment ago).
      if (!/duplicate column/i.test(String((err as Error)?.message ?? err))) throw err;
    }
  }
  // Unique so a resent save can't insert twice. Older rows have no client_id,
  // and SQLite lets any number of NULLs share a unique index.
  await db().prepare('CREATE UNIQUE INDEX IF NOT EXISTS scores_client_id ON scores (client_id)').run();
  // Small settings the API keeps, like when the public board was last cleared.
  await db().prepare('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)').run();
}

// "YYYY-MM-DD HH:MM:SS" in Perth time, the format created_at uses.
export const perthTime = (ms: number) => new Date(ms + 8 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ');

// These API routes are served by the Worker, not as static assets, so the
// headers in public/_headers don't apply to them. Set the same ones here.
export const json = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: {
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'x-frame-options': 'SAMEORIGIN',
    },
  });

// The admin page is on the public internet, so the PIN has to be long enough
// that guessing it isn't practical. A short one is treated as not set.
const MIN_PIN_LENGTH = 12;

export async function checkAdmin(request: Request): Promise<Response | null> {
  const expected = kioskEnv.DDD_ADMIN_PIN ?? '';
  if (expected.length < MIN_PIN_LENGTH) {
    return json({ error: `Admin is switched off until DDD_ADMIN_PIN is set (${MIN_PIN_LENGTH}+ characters).` }, 503);
  }
  const given = request.headers.get('x-admin-pin') ?? '';
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ]);
  // Hashing first gives equal-length inputs, so the comparison takes the same time either way.
  return subtle.timingSafeEqual(a, b) ? null : json({ error: 'Wrong PIN' }, 401);
}
