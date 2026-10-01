// The prize draw on the booth screen. Admin makes the draw (the server picks
// the winners, see src/lib/ddd2026-prizes.ts); booth devices sitting on the
// home screen or the self-playing game notice within a few seconds and spin a
// wheel of entrants' leaderboard names that lands on each winner in turn. A
// device someone's using waits until they're done, for a couple of minutes.
// Phones never show it. The wheel is theatre: where it lands was decided on
// the server.

import { esc, mount, api, SKY } from './ui.js';

const POLL_MS = 5000;
const SHOW_WITHIN_S = 180; // a draw older than this is old news, not shown
const SPIN_MS = 6000;
const HOLD_MS = 3500; // each winner stays up this long before the next spin
const END_MS = 25_000; // the winners card, then back to the start
const SEEN_KEY = 'perthai-kiosk-draw-seen';
const COLOURS = ['--sunset-500', '--azure-500', '--orchid-300', '--coral-500', '--sunbeam-400', '--sunset-300', '--azure-300'];

let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

export function stopDraw() {
  timers.forEach(clearTimeout);
  timers = [];
}

// Booth devices only. `canShow()` says whether the device is free (nobody
// mid-form or mid-run); `show(draw)` opens the draw screen.
export function watchDraws({ canShow, show }) {
  let seen = 0;
  try {
    seen = Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {}
  const check = async () => {
    let latest;
    try {
      latest = await api('api/draws/latest');
    } catch {
      return; // offline: the draw will still be there next time
    }
    if (!latest || latest.id <= seen || latest.ageSeconds > SHOW_WITHIN_S || !canShow()) return;
    seen = latest.id;
    try {
      localStorage.setItem(SEEN_KEY, String(seen));
    } catch {}
    show(latest);
  };
  check();
  setInterval(check, POLL_MS);
}

// Shows a draw (or, with none given, the latest one: the #draw deep link and
// admin's "Show it here"). `done` goes back to the start.
export async function renderDraw({ draw, config, done }) {
  stopDraw();
  draw ??= await api('api/draws/latest').catch(() => null);
  if (!draw) return done();
  const prize = config.game?.drawPrize ?? 'a prize';
  const root = mount(`
    <section class="view sky draw">
      ${SKY}
      <div class="draw-inner">
        <div class="eyebrow">${draw.kind === 'top' ? 'Quokka Run top score' : 'Quokka Run prize draw'}</div>
        <h1 class="draw-title" data-title>${draw.kind === 'top' ? 'And the top score goes to…' : 'Spinning…'}</h1>
        ${draw.kind === 'top' ? '' : wheelHtml(draw.names)}
        <ol class="draw-winners" data-winners></ol>
        <p class="draw-collect" data-collect hidden></p>
      </div>
    </section>`);
  const title = root.querySelector('[data-title]');
  const list = root.querySelector('[data-winners]');
  const collect = root.querySelector('[data-collect]');
  const finish = () => {
    collect.hidden = false;
    later(done, END_MS);
    // Once the winners are up, a tap goes back to the start.
    root.addEventListener('click', done);
  };

  if (draw.kind === 'top') {
    const [w] = draw.winners;
    later(() => {
      title.textContent = `🏆 ${w.name}`;
      list.innerHTML = `<li><span>${esc(w.name)}</span><b>${w.score}</b></li>`;
      collect.textContent = 'Come and see us at the Perth AI booth to collect your prize!';
      finish();
    }, 1500);
    return;
  }

  const wheel = root.querySelector('.wheel');
  let turned = 0;
  const step = (i) => {
    if (i >= draw.winners.length) {
      title.textContent = draw.winners.length === 1 ? 'Our winner!' : 'Our winners!';
      collect.textContent = `Come and see us at the Perth AI booth for ${prize}. We’ll call you too.`;
      return finish();
    }
    const name = draw.winners[i].name;
    turned = spinTo(wheel, draw.names, name, turned);
    title.textContent = draw.winners.length > 1 ? `Winner ${i + 1} of ${draw.winners.length}…` : 'And the winner is…';
    later(() => {
      title.textContent = `🎉 ${name}!`;
      list.insertAdjacentHTML('beforeend', `<li><span>${esc(name)}</span></li>`);
      later(() => step(i + 1), HOLD_MS);
    }, SPIN_MS);
  };
  later(() => step(0), 800);
}

// ---------- the wheel ----------

// Slice i runs clockwise from 12 o'clock, i/n of the way round.
function wheelHtml(names) {
  const n = names.length;
  const slice = 360 / n;
  const point = (deg, r) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${(r * Math.cos(rad)).toFixed(2)} ${(r * Math.sin(rad)).toFixed(2)}`;
  };
  const slices = names
    .map((name, i) => {
      const a0 = i * slice;
      const a1 = (i + 1) * slice;
      const fill = `var(${COLOURS[i % COLOURS.length]})`;
      // One name on its own would be a full circle, which an arc can't draw.
      const shape =
        n === 1
          ? `<circle r="96" style="fill:${fill}"/>`
          : `<path d="M0 0 L${point(a0, 96)} A96 96 0 ${slice > 180 ? 1 : 0} 1 ${point(a1, 96)} Z" style="fill:${fill}"/>`;
      const label = name.length > 14 ? `${name.slice(0, 13)}…` : name;
      // Every name reads out from the centre to the rim. The wheel spins, so
      // some always end up upside down; all the same way round looks tidier.
      return `${shape}
        <text transform="rotate(${a0 + slice / 2 - 90}) translate(88 0)" text-anchor="end" dominant-baseline="middle"
          style="font-size:${n > 16 ? 6.5 : 8.5}px">${esc(label)}</text>`;
    })
    .join('');
  return `
    <div class="wheel-wrap" aria-hidden="true">
      <div class="wheel-pointer"></div>
      <svg class="wheel" viewBox="-100 -100 200 200"><g>${slices}</g><circle r="96" class="wheel-rim"/><circle r="12" class="wheel-hub"/></svg>
    </div>`;
}

// Turns the wheel so a slice with that name stops under the pointer, after a
// few full turns and a little way off the slice's centre so it doesn't look
// set. Returns the wheel's new total rotation.
function spinTo(wheel, names, name, from) {
  const slice = 360 / names.length;
  const matches = names.flatMap((n, i) => (n === name ? [i] : []));
  const i = matches[Math.floor(Math.random() * matches.length)] ?? 0;
  const centre = (i + 0.5) * slice;
  const jitter = (Math.random() - 0.5) * slice * 0.6;
  const target = (((-centre - jitter - from) % 360) + 360) % 360;
  const to = from + 360 * 5 + target;
  wheel.style.transitionDuration = `${SPIN_MS}ms`;
  wheel.style.transform = `rotate(${to}deg)`;
  return to;
}
