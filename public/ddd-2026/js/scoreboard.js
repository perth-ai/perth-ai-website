// Quokka Run's leaderboard and "save my score" card.

import { esc, api, toast, textField, consentField, wireChoices, readChoices, showErrors } from './ui.js';
import { close as closeKeyboard } from './keyboard.js';

// Leaving an email enters the prize draw, and it's only used to contact the
// winner. Event updates are a separate, unticked opt-in (see forms.js).
const UPDATES_TEXT = 'Send me Perth AI event updates too. Unsubscribe any time.';

function boardHtml(rows, meName) {
  if (!rows.length) return `<p class="empty">No scores yet — be the first!</p>`;
  const me = meName?.trim().toLowerCase();
  return `<ol>${rows
    .map(
      (r) => `<li class="${r.name.toLowerCase() === me ? 'me' : ''}">
        <span class="name">${esc(r.name)}</span>
        <span class="pts">${r.score}</span>
      </li>`
    )
    .join('')}</ol>`;
}

export async function loadBoard(el, game, meName) {
  try {
    const rows = await api(`api/scores?game=${game}&limit=10`);
    el.innerHTML = boardHtml(rows, meName);
  } catch {
    el.innerHTML = `<p class="empty">Leaderboard unavailable.</p>`;
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
      ${textField({ name: 'email', label: 'Email to enter the prize draw', type: 'email', max: 120 })}
    </div>
    ${consentField(UPDATES_TEXT)}
    <p class="hint">Only your leaderboard name is shown on screen. Your email is only used to contact the winner.</p>
    <div class="form-actions">
      <button type="submit" class="btn btn-primary">Save my score</button>
      <button type="button" class="btn btn-ghost-dark" data-action="home">Skip</button>
    </div>
  </form>`;

// Wires the save card and board rendered by saveCard()/boardCard() inside root.
// `result` is { score, correct, rounds? }.
export function wireSaveCard(root, { game, result, onAgain }) {
  const boardEl = root.querySelector('[data-board]');
  loadBoard(boardEl, game);

  const form = root.querySelector('form.save-card');
  wireChoices(form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    closeKeyboard(true);
    const data = readChoices(form);
    const btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      const res = await api('api/scores', { method: 'POST', body: { ...data, ...result, game } });
      form.outerHTML = savedHtml(res, data.name, result.score);
      root.querySelector('[data-again]').addEventListener('click', onAgain);
      loadBoard(boardEl, game, data.name);
    } catch (err) {
      btn.disabled = false;
      if (err.data?.errors) showErrors(form, err.data.errors);
      else toast('Couldn’t save your score — please grab someone at the booth.');
    }
  });
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
