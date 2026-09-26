// Where form sign-ups go: Web3Forms, the same inbox as the website's own forms
// (endpoint and key come from api/config.json, built from src/data/forms.json).
// Venue wifi drops out, so a send that fails is kept on the device and retried
// every minute until it gets through.

import { FORMS } from './forms.js';

const KEY = 'perthai-kiosk-outbox';
const RETRY_MS = 60_000;

let target = null;

export function initOutbox(config) {
  target = config.forms;
  flush();
  setInterval(flush, RETRY_MS);
  addEventListener('online', flush);
}

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
    access_key: target.accessKey,
    subject: `${target.subjectPrefix ?? 'Booth'}: ${form.title}`,
    from_name: target.fromName ?? 'Perth AI booth',
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

function save(items) {
  try {
    if (items.length) localStorage.setItem(KEY, JSON.stringify(items));
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
    for (const item of pending) {
      // Retry with the current key, in case it was rotated since the item was queued.
      if (!(await send({ ...item, access_key: target.accessKey }))) keep.push(item);
    }
    // Anything submitted while this ran was appended after `pending`.
    save([...keep, ...load().slice(pending.length)]);
  } finally {
    flushing = false;
  }
}
