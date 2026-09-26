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

// Creates the table the first time each worker instance touches the database,
// so there's no migration step to remember on deploy. That only covers a new
// database: CREATE TABLE IF NOT EXISTS won't add a column to an existing one,
// so a schema change after the database exists needs an ALTER TABLE here (or
// deleting the database, which is fine before the event).
let ready: Promise<unknown> | undefined;
export function ensureSchema() {
  ready ??= db()
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
    .run()
    // Forget a failed attempt so the next request tries again rather than
    // failing forever on a stale rejection.
    .catch((err: unknown) => {
      ready = undefined;
      throw err;
    });
  return ready;
}

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
