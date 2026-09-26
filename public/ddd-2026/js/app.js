import { FORMS, UPDATES_TEXT, PRIVACY_NOTE, validateForm } from './forms.js';
import { initKeyboard, close as closeKeyboard } from './keyboard.js';
import {
  esc, mount, api, toast, SKY, BACK, hasOwnKeyboard, qrCard,
  textField, chipsField, consentField, wireChoices, readChoices, showErrors,
} from './ui.js';
import { startRunner, startAttract, stopRunner, topRunners } from './runner.js';
import { quokkaIcon } from './sprites.js';
import { renderSummit, stopSummit, summitPhoto } from './summit.js';
import { renderAbout, stopAbout } from './about.js';
import { submitForm, initOutbox } from './outbox.js';

const ICONS = {
  slack: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12Z"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
  events: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2"/>',
  idea: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1.1 2.2h5c.1-.9.5-1.7 1.1-2.2A6 6 0 0 0 12 3Z"/>',
  space: '<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V21M16 10h2.5A1.5 1.5 0 0 1 20 11.5V21M2.5 21h19M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1"/>',
  sponsor: '<path d="M12 20.5s-8-4.6-8-10.7A4.4 4.4 0 0 1 12 7.2a4.4 4.4 0 0 1 8 2.6c0 6.1-8 10.7-8 10.7Z"/>',
  summit: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3Z"/><path d="M19 3v3M17.5 4.5h3"/>',
};

const icon = (name) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const TILES = [
  { id: 'slack', accent: 'var(--orchid-300)', title: 'Join the Slack', blurb: 'Chat, job leads and event planning — get an invite.' },
  { id: 'events', accent: 'var(--azure-500)', title: 'What’s on', blurb: 'Meet-ups, co-builds, workshops. Never miss one.' },
  { id: 'idea', accent: 'var(--sunbeam-400)', title: 'Suggest an event', blurb: 'Got an idea for a session? Tell us.' },
  { id: 'space', accent: 'var(--sunset-300)', title: 'Offer a space', blurb: 'A room for 40 on a weeknight solves our biggest problem.' },
  { id: 'sponsor', accent: 'var(--coral-500)', title: 'Sponsor', blurb: 'Help keep every Perth AI event free.' },
];

let config;
let booth = false;
let current = 'home';
let thanksTimer;
let armIdle = () => {};

// ---------- booth mode ----------
// The booth screen and the tablets open the kiosk with ?booth, which turns on
// attract mode and wiping back to home when idle. Phones (students practising)
// get neither. The device remembers it, so going to admin and back keeps it;
// ?booth=0 turns it off.

const BOOTH_KEY = 'perthai-kiosk-booth';

function isBooth() {
  const param = new URLSearchParams(location.search).get('booth');
  try {
    if (param === '0') localStorage.removeItem(BOOTH_KEY);
    else if (param !== null) localStorage.setItem(BOOTH_KEY, '1');
    return localStorage.getItem(BOOTH_KEY) === '1';
  } catch {
    return param !== null && param !== '0';
  }
}

// ---------- routing ----------

function go(view, arg) {
  clearTimeout(thanksTimer);
  closeKeyboard();
  if (current === 'runner' || current === 'attract') stopRunner();
  if (current === 'summit') stopSummit();
  if (current === 'about') stopAbout();
  current = view;
  if (view === 'home') renderHome();
  else if (view === 'form') renderForm(arg);
  else if (view === 'thanks') renderThanks(arg);
  else if (view === 'runner') startRunner({ config, go });
  else if (view === 'attract') startAttract({ config, go });
  else if (view === 'summit') renderSummit();
  else if (view === 'about') renderAbout({ config, card: arg });
  else return go('home');
  armIdle();
}

document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;
  const { action, arg } = target.dataset;
  if (action === 'home') go('home');
  if (action === 'form') go('form', arg);
  if (action === 'runner') go('runner');
  if (action === 'summit') go('summit');
  if (action === 'about') go('about', arg);
});

// ---------- home ----------

async function renderHome() {
  const root = mount(`
    <section class="view sky home">
      ${SKY}
      <header class="home-header">
        <img class="badge" src="/perth-ai-badge.webp" alt="Perth AI" data-admin-hold>
        <div>
          <div class="eyebrow">Perth AI × ${esc(config.eventName)}</div>
          <h1>Say g’day to <span class="accent">Perth AI.</span></h1>
          <p class="lede">The people building with AI in Perth, in one room. Tap a tile to get started.</p>
        </div>
      </header>
      <div class="tiles">
        <button class="tile tile-about tile-wide" data-action="about">
          <span class="play-tag">START HERE</span>
          <span class="tile-icon"><img src="/perth-ai-mark.webp" alt=""></span>
          <span>
            <h2>Meet Perth AI</h2>
            <p>Who we are, what we run and how to get involved.</p>
          </span>
          <span class="go" aria-hidden="true">→</span>
        </button>
        <button class="tile tile-summit tile-wide" style="--photo:url(${summitPhoto('opening')})" data-action="summit">
          <span class="play-tag">DEC 2026</span>
          <span class="tile-icon">${icon('summit')}</span>
          <span>
            <h2>AI Disrupt 2026</h2>
            <p>Sponsor it, host it or speak at Perth AI’s big one.</p>
          </span>
          <span class="go" aria-hidden="true">→</span>
        </button>
        <button class="tile tile-game tile-runner" data-action="runner">
          <span class="play-tag">PLAY</span>
          <span class="tile-icon"><img src="${quokkaIcon()}" alt=""></span>
          <span>
            <h2>Quokka Run</h2>
            <p>Jump for facts. Win a prize.</p>
            <ol class="tile-board" data-runner-board></ol>
          </span>
          <span class="go" aria-hidden="true">→</span>
        </button>
        ${TILES.map(
          (t) => `
          <button class="tile" style="--accent:${t.accent}" data-action="form" data-arg="${t.id}">
            <span class="tile-icon">${icon(t.id)}</span>
            <span>
              <h2>${esc(t.title)}</h2>
              <p>${esc(t.blurb)}</p>
            </span>
            <span class="go" aria-hidden="true">→</span>
          </button>`
        ).join('')}
      </div>
    </section>`);

  wireAdminHold(root.querySelector('[data-admin-hold]'));

  // The leaderboard is a nice-to-have on the home screen.
  topRunners(3)
    .then((rows) => {
      const slot = root.querySelector('[data-runner-board]');
      if (slot) slot.innerHTML = rows.map((r) => `<li><span>${esc(r.name)}</span><b>${r.score}</b></li>`).join('');
    })
    .catch(() => {});
}

// Hold the badge for 3 seconds to open the admin page.
function wireAdminHold(el) {
  let t;
  const cancel = () => clearTimeout(t);
  el.addEventListener('pointerdown', () => (t = setTimeout(() => (location.href = 'admin'), 3000)));
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, cancel));
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---------- forms ----------

function renderForm(id) {
  const form = FORMS[id];
  if (!form) return go('home');
  const qrs = (form.qrs ?? []).map((q) => qrCard(config.links, q)).join('');
  // One-line fields (name, email, organisation…) sit two to a row so the form
  // fits on one screen. An odd one out keeps the full width.
  const oneLine = form.fields.filter((f) => f.type === 'text' || f.type === 'email');
  const pairs = new Set(oneLine.slice(0, oneLine.length - (oneLine.length % 2)));

  const root = mount(`
    <section class="view form-view">
      <aside class="form-aside sky">
        ${form.parent ? `<button class="btn btn-ghost back" data-action="${form.parent}">← Back</button>` : BACK}
        <div class="eyebrow" style="position:relative">${esc(form.eyebrow)}</div>
        <h1>${esc(form.title)}</h1>
        <p class="intro">${esc(form.intro)}</p>
        ${qrs ? `<div class="qr-cards">${qrs}</div>` : ''}
        <img class="mascot" src="/perth-ai-mark.webp" alt="" aria-hidden="true">
      </aside>
      <div class="form-panel">
        <form novalidate>
          ${form.fields.map((f) => (f.type.includes('chips') ? chipsField(f) : textField({ ...f, short: pairs.has(f) }))).join('')}
          ${form.subscribe ? '' : consentField(UPDATES_TEXT)}
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">${esc(form.submitLabel)}</button>
          </div>
          <p class="form-note">${esc(form.note ?? PRIVACY_NOTE)}</p>
        </form>
      </div>
    </section>`);

  const formEl = root.querySelector('form');
  wireChoices(formEl);

  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    closeKeyboard(true);
    const data = readChoices(formEl);
    const check = validateForm(id, data);
    if (!check.ok) return showErrors(formEl, check.errors);

    const btn = formEl.querySelector('[type=submit]');
    btn.disabled = true;
    try {
      await submitForm(id, check.clean);
      go('thanks', { title: `Thanks, ${data.name.split(' ')[0]}!`, message: form.thanks });
    } catch (err) {
      btn.disabled = false;
      if (err.data?.errors) showErrors(formEl, err.data.errors);
      else toast('Couldn’t save that — please grab someone at the booth.');
    }
  });
}

// ---------- thanks ----------

function renderThanks({ title, message, seconds = 8 }) {
  mount(`
    <section class="view sky thanks">
      ${SKY}
      <div class="thanks-inner">
        <img class="badge" src="/perth-ai-badge.webp" alt="">
        <h1>${esc(title)}</h1>
        <p>${esc(message)}</p>
        <button class="btn btn-primary" data-action="home">Back to start</button>
        <div class="countdown"><span style="animation-duration:${seconds}s"></span></div>
      </div>
    </section>`);
  thanksTimer = setTimeout(() => go('home'), seconds * 1000);
}

// ---------- idle reset ----------
// After idleSeconds with no touches, warn for 10s, then wipe back to home so the
// next visitor never sees the previous person's details. A quiet home screen
// turns into the self-playing Quokka Run after attractSeconds.

function initIdle(seconds, attractSeconds) {
  const WARN = 10;
  let idleTimer;
  let warnTimer;
  let overlay;

  const dismiss = () => {
    overlay?.remove();
    overlay = null;
    clearInterval(warnTimer);
  };

  const reset = () => {
    clearTimeout(idleTimer);
    if (overlay) dismiss();
    if (current === 'attract') return;
    if (current === 'home') {
      if (attractSeconds > 0) idleTimer = setTimeout(() => current === 'home' && go('attract'), attractSeconds * 1000);
      return;
    }
    idleTimer = setTimeout(warn, Math.max(5, seconds - WARN) * 1000);
  };

  const warn = () => {
    if (current === 'home' || current === 'attract') return;
    let left = WARN;
    overlay = document.createElement('div');
    overlay.className = 'idle-warning';
    overlay.innerHTML = `
      <div>
        <div class="big" data-left>${left}</div>
        <h2>Still there?</h2>
        <p>We’ll head back to the start to keep your details private.</p>
        <button class="btn btn-primary">I’m still here</button>
      </div>`;
    document.body.append(overlay);
    warnTimer = setInterval(() => {
      left -= 1;
      const slot = overlay?.querySelector('[data-left]');
      if (slot) slot.textContent = left;
      if (left <= 0) {
        dismiss();
        go('home');
      }
    }, 1000);
  };

  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, reset, { capture: true }));
  return reset;
}

// ---------- boot ----------

async function boot() {
  config = await api('api/config.json');
  booth = isBooth();
  document.documentElement.classList.toggle('booth', booth);
  initOutbox(config);
  initKeyboard(booth && config.onScreenKeyboard && !hasOwnKeyboard());
  if (booth) armIdle = initIdle(config.idleSeconds, config.attractSeconds);

  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dragstart', (e) => e.preventDefault());

  // #form/slack, #runner, #summit or #attract deep links are handy for testing.
  const [, view, arg] = location.hash.match(/^#(\w+)(?:\/(\w+))?/) || [];
  go(view || 'home', arg);
}

boot();
