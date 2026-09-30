// Things to send, kept on the device until each one gets through: sign-ups
// (outbox.js) and Quokka Run scores (scoreboard.js). Venue wifi drops out,
// and nobody at the booth should have to deal with that, so the visitor is
// never told to wait or try again.
//
// Save first, then send. An item is written to localStorage before the first
// attempt, so it survives the page resetting mid-send (the idle wipe, a
// reload, an iPad closing the app). Whatever doesn't get through is retried
// every minute, and as soon as the device is back online.
//
// The queue is bounded, because it holds names and emails in plain text:
// anything still unsent after MAX_AGE_MS is dropped, it never holds more than
// MAX_ITEMS, and each retry sends at most BATCH, stopping as soon as a send
// shows the device is offline so it doesn't sit through ten timeouts a minute
// (an item the server has merely not accepted yet is skipped over, not a
// stopping point, so one wedged sign-up can't block the ones behind it).
// A booth's day of sign-ups waiting out a wifi drop sits well inside all three.
//
// If storage is unavailable (private mode, blocked site data), an item that
// fails its first send is lost, as it would be without the queue.

import { newId } from './ui.js';

const RETRY_MS = 60_000;
const MAX_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_ITEMS = 200;
const BATCH = 10;

// `send(data)` resolves to { result, value }: 'sent' (done), 'retry' (keep it
// and try later) or 'drop' (it can never succeed). It may also set
// `offline: true` to say the send never reached the server (timed out or no
// connection): flush() stops the whole batch on that, so an offline device
// doesn't sit through ten timeouts, but a server that answered "not yet" only
// skips that one item so it can't block the queue behind it. A throw counts as
// an offline 'retry'.
// `migrate(stored)` can upgrade items saved by an older version of the kiosk.
export function createQueue(key, send, { migrate = (item) => item } = {}) {
  const inFlight = new Set();
  let flushing = false;

  function load() {
    try {
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(items) ? items.map(migrate).filter((item) => item?.id) : [];
    } catch {
      return [];
    }
  }

  // Applies the bounds: drops anything too old (or undated), then keeps only the newest MAX_ITEMS.
  function save(items) {
    const fresh = items.filter((item) => Date.now() - item.at <= MAX_AGE_MS).slice(-MAX_ITEMS);
    try {
      if (fresh.length) localStorage.setItem(key, JSON.stringify(fresh));
      else localStorage.removeItem(key);
    } catch {}
  }

  async function attempt(item) {
    inFlight.add(item.id);
    try {
      let outcome;
      try {
        outcome = await send(item.data);
      } catch {
        outcome = { result: 'retry', offline: true };
      }
      // Reloaded, not filtered from `item`, so anything added meanwhile survives.
      if (outcome.result !== 'retry') save(load().filter((i) => i.id !== item.id));
      return outcome;
    } finally {
      inFlight.delete(item.id);
    }
  }

  // Saves `data` on the device, then tries to send it straight away. Resolves
  // to that first attempt's outcome; if it's 'retry', the queue carries on.
  async function submit(data) {
    const item = { id: newId(), at: Date.now(), data };
    save([...load(), item]);
    const outcome = await attempt(item);
    // The wifi's working, so send anything else that was waiting.
    if (outcome.result === 'sent') flush();
    return outcome;
  }

  async function flush() {
    if (flushing) return;
    flushing = true;
    const run = async () => {
      let tries = 0;
      for (const item of load()) {
        if (tries >= BATCH) break;
        if (inFlight.has(item.id)) continue;
        tries += 1;
        // Stop the batch only when the device is actually offline. An item the
        // server answered but did not accept is kept and skipped, so it can't
        // wedge the sign-ups behind it.
        if ((await attempt(item)).offline) break;
      }
    };
    try {
      // One tab per device at a time, so a phone with the kiosk open twice
      // doesn't send everything twice. (Older browsers without locks just run.)
      if (navigator.locks) await navigator.locks.request(key, { ifAvailable: true }, (lock) => lock && run());
      else await run();
    } finally {
      flushing = false;
    }
  }

  // Starts the retries. The first one waits a random few seconds so booth
  // devices coming back online together don't all send at the same instant.
  function start() {
    setTimeout(() => {
      flush();
      setInterval(flush, RETRY_MS);
    }, Math.random() * 15_000);
    addEventListener('online', flush);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && flush());
  }

  return { submit, flush, start, count: () => load().length };
}
