// Quokka Run's leaderboard and "save my score" card.

import { esc, api, newId, textField, consentField, formError, wireChoices, readChoices, showErrors } from './ui.js';
import { createQueue } from './queue.js';
import { validateScore } from './scoring.js';
import { close as closeKeyboard } from './keyboard.js';

// Leaving a mobile or an email enters the prize draw, and they're only used to
// contact a winner. Event updates are a separate, unticked opt-in (see forms.js).
const UPDATES_TEXT = 'Send me Perth AI event updates too. Unsubscribe any time.';

// `meId` is the row to highlight: the player's best run, as the API reports
// it after a save. By id, not name, because two players can share a name.
function boardHtml(rows, meId) {
  if (!rows.length) return `<p class="empty">No scores yet — be the first!</p>`;
  return `<ol>${rows
    .map(
      (r) => `<li class="${meId != null && r.id === meId ? 'me' : ''}">
        <span class="name">${esc(r.name)}</span>
        <span class="pts">${r.score}</span>
      </li>`
    )
    .join('')}</ol>`;
}

// A board that fails to refresh keeps showing what it had. With nothing to
// show yet, it says so without making it sound like something's broken.
export async function loadBoard(el, game, meId) {
  try {
    const rows = await api(`api/scores?game=${game}&limit=10`);
    el.innerHTML = boardHtml(rows, meId);
    el.dataset.loaded = '';
  } catch {
    if (!('loaded' in el.dataset)) el.innerHTML = `<p class="empty">The leaderboard will be back shortly.</p>`;
  }
}

export const boardCard = () => `
  <div class="board">
    <h2>Leaderboard</h2>
    <div data-board><p class="empty">Loading…</p></div>
  </div>`;

export const saveCard = () => `
  <form class="save-card" novalidate>
    <h3>Get on the leaderboard</h3>
    <div class="pair">
      ${textField({ name: 'name', label: 'Leaderboard name', type: 'text', required: true, max: 16 })}
      ${textField({ name: 'phone', label: 'Mobile, to call if you win', type: 'tel', max: 20 })}
    </div>
    ${textField({ name: 'email', label: 'Email', type: 'email', max: 120 })}
    <p class="hint">Leave a mobile or email to enter the prize draw. Only your leaderboard name is shown on screen; your number and email are only used if you win.</p>
    ${consentField(UPDATES_TEXT)}
    ${formError()}
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save my score</button>
      <button type="button" class="btn btn-ghost-dark" data-action="home">Skip</button>
    </div>
  </form>`;

// Scores are saved on the device first and sent from there (queue.js), so a
// wifi drop never loses one and the visitor is never sent to find someone. Each
// run carries its own id, so however many times it's resent, the API stores it
// once. A 400 or 429 is final (the score can never be accepted); anything else,
// including the API's "busy" 503, is retried.
const scores = createQueue('perthai-kiosk-scores', async (body) => {
  try {
    return { result: 'sent', value: await api('api/scores', { method: 'POST', body }) };
  } catch (err) {
    const final = (err.status === 400 || err.status === 429) && !err.data?.retry;
    // status 0 means the send never reached the server (offline or timed out),
    // so the queue stops the batch instead of timing out on the next score.
    return { result: final ? 'drop' : 'retry', value: err.data, offline: err.status === 0 };
  }
});

// Starts retrying any scores left on this device (called once at boot).
export const startScoreQueue = () => scores.start();

// How many scores on this device haven't reached the board yet (shown in admin).
export const pendingScores = () => scores.count();

// Wires the save card and board rendered by saveCard()/boardCard() inside root.
// `result` is { score, correct, rounds?, playedAt }.
export function wireSaveCard(root, { game, result, onAgain }) {
  const boardEl = root.querySelector('[data-board]');
  loadBoard(boardEl, game);

  const form = root.querySelector('form.save-card');
  wireChoices(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    closeKeyboard(true);
    const data = readChoices(form);
    const body = { ...data, ...result, game, clientId: newId() };
    // The same rules the API applies, checked here so they work offline too.
    const check = validateScore(body);
    if (!check.ok) return showErrors(form, check.errors);

    const btn = form.querySelector('[type=submit]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving…'; // on slow wifi this can take a few seconds
    const { result: outcome, value } = await scores.submit(body);
    if (outcome === 'drop') {
      btn.disabled = false;
      btn.textContent = label;
      return showErrors(form, value?.errors ?? { _form: 'That score can’t be saved.' });
    }
    // No rank means the score arrived but isn't on the public board (admin hid
    // that player), so it gets the plain "saved" card too.
    const ranked = outcome === 'sent' && value?.rank != null;
    form.outerHTML = ranked ? savedHtml(value, data.name, result.score) : queuedHtml(data.name, outcome === 'sent');
    root.querySelector('[data-again]').addEventListener('click', onAgain);
    if (outcome === 'sent') loadBoard(boardEl, game, value.bestId);
  });
}

// Saved on the device, but the wifi's down, so it'll reach the board by
// itself. (Or it reached us but isn't on the public board: then no promise.)
function queuedHtml(name, arrived) {
  return `
    <div class="save-card">
      <h3>Saved, ${esc(name.trim())}!</h3>
      ${arrived ? '' : '<p class="hint">Your score will show on the leaderboard in a minute or two.</p>'}
      <div class="form-actions">
        <button type="button" class="btn btn-primary" data-again>Play again</button>
        <button type="button" class="btn btn-ghost-dark" data-action="home">Done</button>
      </div>
    </div>`;
}

function savedHtml({ rank, best }, name, score) {
  const heading = rank === 1 && score >= best ? '🏆 New high score' : `You’re #${rank}`;
  const hint =
    score < best
      ? `Your best is still ${best}. Play again to beat it.`
      : rank <= 10
        ? 'Check yourself out on the board.'
        : 'Play again to climb the board.';
  return `
    <div class="save-card">
      <h3>${heading}, ${esc(name.trim())}!</h3>
      <p class="hint">${hint}</p>
      <div class="form-actions">
        <button type="button" class="btn btn-primary" data-again>Play again</button>
        <button type="button" class="btn btn-ghost-dark" data-action="home">Done</button>
      </div>
    </div>`;
}
