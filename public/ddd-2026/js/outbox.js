// Where form sign-ups go: Web3Forms, the same inbox as the website's own forms
// (endpoint and key come from api/config.json, built from src/data/forms.json).
// Each sign-up is saved on the device first and sent from there, retried until
// Web3Forms accepts it (queue.js), so a wifi drop never loses one.
//
// The email is built when it's sent, not when it's saved, so a sign-up made
// before the config arrived still gets the right key and the "DDD Perth 2026
// booth: …" subject the inbox filters on.

import { FORMS } from './forms.js';
import { createQueue } from './queue.js';
import { fetchWithTimeout } from './ui.js';

let target = null;

// Sign-ups are never dropped for being refused: a bad or missing key is a
// setup problem, and the sign-up should still arrive once it's fixed. They
// only leave the device once sent, or when the queue's age limit is reached.
const outbox = createQueue('perthai-kiosk-outbox', async (data) => {
  if (!target?.accessKey) return { result: 'retry' }; // not wired up yet: keep it until it is
  const res = await fetchWithTimeout(target.endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(toPayload(data)),
  });
  const body = await res.json().catch(() => ({}));
  return { result: res.ok && body.success === true ? 'sent' : 'retry' };
}, { migrate });

export function initOutbox(config) {
  target = config.forms ?? null;
  outbox.start();
}

// Where to send, from config. Called again if the config only arrives after boot.
export function setOutboxTarget(forms) {
  target = forms ?? null;
  outbox.flush();
}

// Never rejects, and doesn't wait for the send: the sign-up is on the device
// before this returns, so the visitor can see "thanks" straight away.
export function submitForm(id, clean) {
  outbox.submit({ form: id, clean, submittedAt: new Date().toISOString() });
}

// How many sign-ups on this device haven't reached the inbox yet (shown in admin).
export const pendingCount = () => outbox.count();

function toPayload({ form: id, clean, submittedAt, payload }) {
  const subject = (title) => `${target?.subjectPrefix ?? 'DDD Perth 2026 booth'}: ${title}`;
  const from_name = target?.fromName ?? 'Perth AI booth';
  // Saved by an older version of the kiosk, already in Web3Forms' shape.
  if (payload) {
    return { ...payload, access_key: target.accessKey, subject: subject(FORMS[payload.form]?.title ?? 'Sign-up'), from_name };
  }
  const form = FORMS[id];
  const fields = {};
  for (const f of form?.fields ?? []) {
    const v = clean[f.name];
    fields[f.name] = Array.isArray(v) ? v.join(', ') : v;
  }
  return {
    access_key: target.accessKey,
    subject: subject(form?.title ?? id),
    from_name,
    form: id,
    ...fields,
    // Whether they opted in to Perth AI event updates, i.e. may go on the mailing list.
    event_updates: clean.updates ? 'Yes' : 'No',
    submitted_at: submittedAt,
  };
}

// The previous kiosk stored bare Web3Forms payloads. Their id is built from
// the payload itself, so it's the same every time the queue is read.
function migrate(item) {
  if (item?.id) return item;
  if (!item?.submitted_at) return null;
  return { id: `legacy-${item.submitted_at}-${item.email ?? ''}`, at: Date.parse(item.submitted_at), data: { payload: item } };
}
