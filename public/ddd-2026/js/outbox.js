// Where form sign-ups go: Web3Forms, the same inbox as the website's own forms
// (endpoint and key come from api/config.json, built from src/data/forms.json).
// Venue wifi drops out, so a send that fails is kept on the device and retried
// every minute until it gets through.
//
// The queue is bounded, because it holds names and emails in plain text in
// localStorage: anything still unsent after MAX_AGE_MS is dropped, it never
// holds more than MAX_ITEMS, and each retry sends at most FLUSH_BATCH so a bad
// access key can't re-POST the whole backlog every minute. A booth's day of
// sign-ups waiting out a wifi drop sits well inside all three.

import { FORMS } from './forms.js';

const KEY = 'perthai-kiosk-outbox';
const RETRY_MS = 60_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_ITEMS = 200;
const FLUSH_BATCH = 10;

let target = null;

export function initOutbox(config) {
  setOutboxTarget(config.forms);
  setInterval(flush, RETRY_MS);
  addEventListener('online', flush);
}

// Where to send, from config. Called again if the config only arrives after boot.
export function setOutboxTarget(forms) {
  target = forms ?? null;
  flush();
}

// Never rejects: a send that fails is queued for the retry loop, so the
// visitor sees "thanks" either way. The admin page shows what's waiting.
export async function submitForm(id, clean) {
  const payload = toPayload(id, clean);
  if (!(await send(payload))) queue(payload);
}

// How many sign-ups on this device haven't reached the inbox yet (shown in admin).
export const pendingCount = () => load().length;

function toPayload(id, clean) {
  const form = FORMS[id];
  const fields = {};
  for (const f of form.fields) {
    const v = clean[f.name];
    fields[f.name] = Array.isArray(v) ? v.join(', ') : v;
  }
  return {
    access_key: target?.accessKey,
    subject: `${target?.subjectPrefix ?? 'Booth'}: ${form.title}`,
    from_name: target?.fromName ?? 'Perth AI booth',
    form: id,
    ...fields,
    // Whether they opted in to Perth AI event updates, i.e. may go on the mailing list.
    event_updates: clean.updates ? 'Yes' : 'No',
    submitted_at: new Date().toISOString(),
  };
}

// True once Web3Forms has accepted it. Anything else (offline, busy, over a
// limit, a bad key) keeps it on the device, so no sign-up is dropped: the
// admin page shows how many are waiting.
async function send(payload) {
  if (!target?.accessKey) return false; // not wired up: keep it until it is
  try {
    const res = await fetch(target.endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return res.ok && body.success === true;
  } catch {
    return false;
  }
}

// Storage can be unavailable (private mode, blocked site data). Then a failed
// send is lost, same as it would be without the outbox.
function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

// Applies the bounds: drops anything too old (or undated), then keeps only the newest MAX_ITEMS.
function save(items) {
  const fresh = items.filter((item) => Date.now() - Date.parse(item.submitted_at) <= MAX_AGE_MS).slice(-MAX_ITEMS);
  try {
    if (fresh.length) localStorage.setItem(KEY, JSON.stringify(fresh));
    else localStorage.removeItem(KEY);
  } catch {}
}

function queue(payload) {
  save([...load(), payload]);
}

let flushing = false;
async function flush() {
  if (flushing) return;
  flushing = true;
  try {
    const pending = load();
    if (!pending.length) return;
    const keep = [];
    let sent = 0;
    for (const item of pending) {
      if (sent >= FLUSH_BATCH) {
        keep.push(item);
        continue;
      }
      sent += 1;
      // Retry with the current key, in case it was rotated since the item was queued.
      if (!(await send({ ...item, access_key: target?.accessKey }))) keep.push(item);
    }
    // Anything submitted while this ran was appended after `pending`.
    save([...keep, ...load().slice(pending.length)]);
  } finally {
    flushing = false;
  }
}
