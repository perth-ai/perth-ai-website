// Quokka Run — a one-tap endless runner. Tap to jump over hallucination bugs,
// rate limits and GPU fires. Every so often a gate shows a statement from the
// statement pool (game/questions.json): jump through it for FACT, run under for HALLUCINATION.
// It levels up every LEVEL_EVERY_S seconds (faster, tighter, new obstacles), and
// gate statements go from easy to hard over the run.
//
// The same engine also plays itself (autopilot) behind the intro screen and as
// the attract-mode screensaver.

import { esc, mount, api, SKY, BACK } from './ui.js';
import { loadQuestions, pickRamp, LEVEL_NAMES } from './questions.js';
import { sprites } from './sprites.js';
import { loadBoard, boardCard, saveCard, wireSaveCard } from './scoreboard.js';

// World units: the playfield is ~540 units tall on a landscape screen.
const PX = 4; // world units per sprite pixel
const QUOKKA = { x: 120, w: 20 * PX, h: 16 * PX };
const GRAVITY = 2600;
const JUMP_V = 900; // ~155 units high, ~0.7s in the air
const BUFFER_S = 0.12; // a tap just before landing still jumps
const START_SPEED = 380;
const ACCEL = 8; // units/s gained per second, up to the current level's top speed
const DEMO_MAX_SPEED = 560; // autopilot stays watchable
const LEVEL_EVERY_S = 20;

// speed: top speed. gap: seconds of travel between obstacles, [minimum, random extra].
// Obstacle kinds accumulate: each level adds to the ones before it.
const LEVELS = [
  { speed: 440, gap: [0.95, 0.9], adds: ['bug', 'gpu'] },
  { speed: 520, gap: [0.9, 0.8], adds: ['sign'], note: '429 rate limits ahead' },
  { speed: 600, gap: [0.9, 0.7], adds: ['pair'], note: 'Hallucinations come in pairs now' },
  { speed: 680, gap: [0.85, 0.6], adds: ['drone'], note: 'Flying hallucinations — stay low!' },
  { speed: 760, gap: [0.85, 0.5], adds: ['triple'], note: 'Triple hallucination' },
  { speed: 840, gap: [0.8, 0.45], adds: [], note: 'Faster…' },
  { speed: 900, gap: [0.8, 0.4], adds: [], note: 'Maximum hallucination' },
].map((level, i, all) => ({ ...level, kinds: all.slice(0, i + 1).flatMap((l) => l.adds) }));
const FIRST_GATE_S = 12;
const GATE_EVERY_S = 22;
const READ_S = 7; // time between a statement appearing and reaching its gate
const GATE = { w: 130, split: 92, top: 250 }; // split = height of the HALLUCINATION panel
const GATE_POINTS = { 1: 150, 2: 250, 3: 400 }; // by statement difficulty
const TOKEN_POINTS = 20;
const RESULT_MS = 4200;

const CAUSES = {
  bug: 'Tripped over a hallucination',
  gpu: 'Singed by a GPU fire',
  sign: 'Hit a 429 rate limit',
  drone: 'Jumped into a flying hallucination',
};

const COLORS = {
  ground: '#6c789d',
  road: 'rgb(5 10 23 / 0.88)',
  pebble: '#232f52',
  fact: '#00c2ff',
  hallu: '#ff6b8a',
  token: '#ffc785',
  tokenEdge: '#dc7700',
  sign: '#ff6b8a',
  signEdge: '#8c1d36',
  post: '#99a0b8',
};

// ---------- engine ----------

// Exported (with `invincible` and `speedCap`) so a bot can check every level is clearable.
export function createEngine(canvas, {
  autopilot = false,
  invincible = autopilot,
  speedCap = autopilot ? DEMO_MAX_SPEED : Infinity,
  gates = true,
  questions = [],
  onGate,
  onGateResult,
  onLevel,
  onOver,
}) {
  const ctx = canvas.getContext('2d');
  const art = sprites();
  let W = 0;
  let H = 0;
  let G = 0; // ground line
  let raf = 0;
  let last = 0;

  const s = {
    clock: 0,
    level: 0,
    speed: START_SPEED,
    dist: 0,
    score: 0,
    tokens: 0,
    gatesSeen: 0,
    gatesRight: 0,
    y: 0, // quokka height above the ground
    vy: 0,
    buffered: -1,
    obstacles: [],
    coins: [],
    gate: null,
    spawnIn: 600,
    coinIn: 900,
    nextGate: FIRST_GATE_S,
    queue: [...questions],
    over: false,
    cause: null,
  };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    // Landscape shows ~900 units across; portrait zooms in a little and lifts
    // the ground towards the middle rather than leaving a tall empty sky.
    const scale = Math.min(h / 540, w / 700);
    W = w / scale;
    H = h / scale;
    G = Math.min(H - Math.max(80, H * 0.16), 540 + H * 0.1);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const onGround = () => s.y <= 0;

  // Fixed-height jump: a quick tap on a touch screen should clear anything.
  function jump() {
    if (s.over) return;
    if (onGround()) s.vy = JUMP_V;
    else s.buffered = BUFFER_S;
  }

  // ----- spawning -----

  function spawnObstacle() {
    const { kinds, gap } = LEVELS[s.level];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const x = W + 20;
    const bug = (i) => ({ kind: 'bug', x: x + i * 12 * PX, y: 0, w: 12 * PX, h: 10 * PX });
    if (kind === 'bug') s.obstacles.push(bug(0));
    if (kind === 'pair') s.obstacles.push(bug(0), bug(1));
    if (kind === 'triple') s.obstacles.push(bug(0), bug(1), bug(2));
    if (kind === 'gpu') s.obstacles.push({ kind, x, y: 0, w: 12 * PX, h: 12 * PX });
    if (kind === 'sign') s.obstacles.push({ kind, x, y: 0, w: 34, h: 70 });
    // Floats just above the quokka's head: run under it, don't jump.
    if (kind === 'drone') s.obstacles.push({ kind, x, y: 72, w: 12 * PX, h: 12 * PX });
    // Always leave room to land and jump again; more room at random.
    s.spawnIn = s.speed * (gap[0] + Math.random() * gap[1]) + 80;
  }

  function spawnCoin() {
    s.coins.push({ x: W + 20, y: 70 + Math.random() * 80, r: 12 });
    s.coinIn = s.speed * (1.5 + Math.random() * 2.5);
  }

  function startGate() {
    const q = s.queue.shift();
    if (!q) return (s.nextGate = Infinity);
    s.gate = { q, x: QUOKKA.x + s.speed * READ_S, jumped: false, done: false };
    onGate?.(q);
  }

  // ----- update -----

  const hits = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function quokkaBox() {
    // Forgiving hitbox: skip the ears, tail and toes.
    return { x: QUOKKA.x + 10, w: QUOKKA.w - 22, y: s.y + 4, h: QUOKKA.h - 18 };
  }

  function autopilotStep() {
    const centre = QUOKKA.x + QUOKKA.w / 2;
    const lead = s.speed * 0.34; // jump so the apex lands over the obstacle's middle
    if (!onGround()) return;
    const ground = s.obstacles.filter((o) => o.y === 0);
    const next = ground.find((o) => o.x + o.w > QUOKKA.x);
    if (next) {
      const run = ground.filter((o) => o.x >= next.x && o.x <= next.x + 12 * PX * 2);
      const end = Math.max(...run.map((o) => o.x + o.w));
      if ((next.x + end) / 2 - centre <= lead) return void (s.vy = JUMP_V);
    }
    const g = s.gate;
    if (g && !g.done && g.q.fact && g.x + GATE.w / 2 - centre <= lead) s.vy = JUMP_V;
  }

  function update(dt) {
    if (s.over) return;
    s.clock += dt;
    const level = Math.min(LEVELS.length - 1, Math.floor(s.clock / LEVEL_EVERY_S));
    if (level !== s.level) {
      s.level = level;
      onLevel?.(level + 1, LEVELS[level].note);
    }
    if (!s.gate) s.speed = Math.min(speedCap, LEVELS[level].speed, s.speed + ACCEL * dt);
    const dx = s.speed * dt;
    s.dist += dx;
    s.score += dx / 40;

    // quokka
    if (autopilot) autopilotStep();
    if (s.buffered > 0) {
      s.buffered -= dt;
      if (onGround()) {
        s.vy = JUMP_V;
        s.buffered = -1;
      }
    }
    if (!onGround() || s.vy > 0) {
      s.vy -= GRAVITY * dt;
      s.y = Math.max(0, s.y + s.vy * dt);
      if (s.y === 0) s.vy = 0;
    }

    // world
    for (const o of s.obstacles) o.x -= dx;
    for (const c of s.coins) c.x -= dx;
    s.obstacles = s.obstacles.filter((o) => o.x + o.w > -20);
    s.coins = s.coins.filter((c) => c.x + c.r > -20 && !c.taken);

    const gateOpen = s.gate && !s.gate.done;
    if (!gateOpen) {
      s.spawnIn -= dx;
      s.coinIn -= dx;
      if (s.spawnIn <= 0) spawnObstacle();
      if (s.coinIn <= 0) spawnCoin();
      if (gates && !s.gate && s.clock >= s.nextGate) startGate();
    }

    // gate
    const g = s.gate;
    if (g) {
      g.x -= dx;
      const overlapping = g.x < QUOKKA.x + QUOKKA.w - 10 && g.x + GATE.w > QUOKKA.x + 10;
      if (overlapping && s.y > 20) g.jumped = true;
      if (!g.done && g.x + GATE.w < QUOKKA.x + 10) {
        g.done = true;
        const right = g.jumped === g.q.fact;
        s.gatesSeen += 1;
        if (right) {
          s.gatesRight += 1;
          s.score += GATE_POINTS[g.q.level] ?? GATE_POINTS[2];
        }
        s.spawnIn = s.speed * 0.9;
        s.nextGate = s.clock + GATE_EVERY_S;
        onGateResult?.(g.q, right, g.jumped);
      }
      if (g.done && g.x + GATE.w < -20) s.gate = null;
    }

    // collisions
    const me = quokkaBox();
    for (const c of s.coins) {
      if (hits(me, { x: c.x - c.r, y: c.y - c.r, w: c.r * 2, h: c.r * 2 })) {
        c.taken = true;
        s.tokens += 1;
        s.score += TOKEN_POINTS;
      }
    }
    if (!invincible) {
      const hit = s.obstacles.find((o) => hits(me, { x: o.x + 4, y: o.y, w: o.w - 8, h: o.h - 4 }));
      if (hit) {
        s.over = true;
        s.cause = hit.kind;
        setTimeout(() => onOver?.(result()), 900);
      }
    }
  }

  // ----- draw -----

  const img = (sprite, x, yFromGround) =>
    ctx.drawImage(sprite, x, G - yFromGround - sprite.height * PX, sprite.width * PX, sprite.height * PX);

  function drawGround() {
    // Dark road under the runner so it reads clearly over the skyline.
    ctx.fillStyle = COLORS.road;
    ctx.fillRect(0, G, W, H - G);
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, G, W, 3);
    ctx.fillStyle = COLORS.pebble;
    const gap = 37;
    for (let k = Math.floor(s.dist / gap); k * gap - s.dist < W; k++) {
      const hash = (k * 2654435761) >>> 0;
      const x = k * gap - s.dist;
      ctx.fillRect(x, G + 10 + (hash % 4) * 9, 4 + (hash % 3) * 4, 3);
    }
  }

  function drawSign(o) {
    const top = G - o.h;
    ctx.fillStyle = COLORS.post;
    ctx.fillRect(o.x + o.w / 2 - 3, top + 24, 6, o.h - 24);
    ctx.fillStyle = COLORS.signEdge;
    ctx.fillRect(o.x - 6, top, o.w + 12, 30);
    ctx.fillStyle = COLORS.sign;
    ctx.fillRect(o.x - 3, top + 3, o.w + 6, 24);
    ctx.fillStyle = '#fff';
    ctx.font = '700 17px "Space Grotesk Variable", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('429', o.x + o.w / 2, top + 16);
  }

  function drawCoin(c) {
    const y = G - c.y;
    ctx.fillStyle = COLORS.tokenEdge;
    ctx.beginPath();
    ctx.arc(c.x, y, c.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.token;
    ctx.beginPath();
    ctx.arc(c.x, y, c.r - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.tokenEdge;
    ctx.font = '700 13px "Space Grotesk Variable", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', c.x, y + 1);
  }

  function drawGate(g, front) {
    const x = g.x;
    const splitY = G - GATE.split;
    const topY = G - GATE.top;
    if (!front) {
      // posts
      ctx.fillStyle = '#e0e3eb';
      ctx.fillRect(x - 6, topY - 8, 6, GATE.top + 8);
      ctx.fillRect(x + GATE.w, topY - 8, 6, GATE.top + 8);
      ctx.fillRect(x - 6, topY - 8, GATE.w + 12, 6);
      ctx.fillRect(x - 6, splitY - 3, GATE.w + 12, 6);
      return;
    }
    const dim = g.done ? 0.12 : 0.3;
    ctx.globalAlpha = dim;
    ctx.fillStyle = COLORS.fact;
    ctx.fillRect(x, topY - 2, GATE.w, splitY - topY - 1);
    ctx.fillStyle = COLORS.hallu;
    ctx.fillRect(x, splitY + 3, GATE.w, GATE.split - 3);
    ctx.globalAlpha = g.done ? 0.4 : 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.fact;
    ctx.font = '700 22px "Space Grotesk Variable", sans-serif';
    ctx.fillText('FACT', x + GATE.w / 2, (topY + splitY) / 2 - 10);
    ctx.font = '700 15px "Space Grotesk Variable", sans-serif';
    ctx.fillText('↑ jump', x + GATE.w / 2, (topY + splitY) / 2 + 14);
    ctx.fillStyle = COLORS.hallu;
    ctx.font = '700 13px "Space Grotesk Variable", sans-serif';
    ctx.fillText('HALLUCINATION', x + GATE.w / 2, splitY + GATE.split / 2 - 8);
    ctx.font = '700 15px "Space Grotesk Variable", sans-serif';
    ctx.fillText('→ run', x + GATE.w / 2, splitY + GATE.split / 2 + 14);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawGround();
    if (s.gate) drawGate(s.gate, false);
    for (const c of s.coins) drawCoin(c);
    const flicker = Math.floor(s.clock * 8) % 2;
    for (const o of s.obstacles) {
      if (o.kind === 'bug') img(art.bug, o.x, Math.abs(Math.sin(s.clock * 6 + o.x)) * 4);
      if (o.kind === 'gpu') img(art.gpu[flicker], o.x, 0);
      if (o.kind === 'drone') img(art.drone[flicker], o.x, o.y + Math.sin(s.clock * 5) * 3);
      if (o.kind === 'sign') drawSign(o);
    }
    const frame = !onGround() ? art.jump : Math.floor(s.dist / 60) % 2 ? art.run1 : art.run2;
    if (s.over) {
      ctx.save();
      ctx.translate(QUOKKA.x + QUOKKA.w / 2, G - s.y - QUOKKA.h / 2);
      ctx.rotate(-0.35);
      ctx.drawImage(frame, -QUOKKA.w / 2, -QUOKKA.h / 2, QUOKKA.w, QUOKKA.h);
      ctx.restore();
    } else {
      img(frame, QUOKKA.x, s.y);
    }
    if (s.gate) drawGate(s.gate, true);
  }

  function loop(now) {
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const result = () => ({
    score: Math.round(s.score),
    correct: s.gatesRight,
    rounds: s.gatesSeen,
    tokens: s.tokens,
    level: s.level + 1,
    metres: Math.round(s.dist / 40),
    cause: s.cause,
  });

  return {
    jump,
    score: () => Math.round(s.score),
    stats: () => ({ tokens: s.tokens, gatesRight: s.gatesRight, gatesSeen: s.gatesSeen, level: s.level + 1 }),
    stop() {
      cancelAnimationFrame(raf);
      ro.disconnect();
    },
  };
}

// ---------- screens ----------

let app; // { config, go }
let pool = [];
let engine = null;
let hudRaf = 0;
let gateTimer = 0;
let cleanup = [];

export function stopRunner() {
  engine?.stop();
  engine = null;
  cancelAnimationFrame(hudRaf);
  clearTimeout(gateTimer);
  cleanup.forEach((fn) => fn());
  cleanup = [];
}

const shell = (extra = '') => `
  <section class="view sky runner ${extra}">
    ${SKY}
    <canvas class="runner-canvas"></canvas>
    <div class="gate-card" hidden></div>
  </section>`;

export async function startRunner(context) {
  app = context;
  stopRunner();
  pool = await loadQuestions();
  renderIntro();
}

function renderIntro() {
  stopRunner();
  const root = mount(shell());
  root.insertAdjacentHTML(
    'beforeend',
    `${BACK}
    <div class="runner-panel">
      <div class="game-intro">
        <div>
          <div class="eyebrow">Perth AI arcade</div>
          <h1 class="game-title">Quokka <span class="fact">Run</span></h1>
          <ul class="rules">
            <li><span>Tap anywhere to jump.</span></li>
            <li><span>Dodge hallucinations, GPU fires and 429 rate limits. Grab tokens for bonus points.</span></li>
            <li><span>At each gate, jump through for <b class="fact">FACT</b> or run under for <b class="hallu">HALLUCINATION</b>. Harder statements are worth more.</span></li>          </ul>
          <p class="rotate-tip">📱 Turn your phone sideways to see further ahead.</p>
          ${app.config.game?.prize ? `<div class="prize">🏆 ${esc(app.config.game.prize)}</div><br>` : ''}
          <button class="btn btn-primary btn-start" data-start>Start running</button>
        </div>
        ${boardCard()}
      </div>
    </div>`
  );
  engine = createEngine(root.querySelector('canvas'), { autopilot: true, gates: false });
  loadBoard(root.querySelector('[data-board]'), 'runner');
  root.querySelector('[data-start]').addEventListener('click', play);
}

function play() {
  stopRunner();
  const root = mount(shell('playing'));
  root.insertAdjacentHTML(
    'beforeend',
    `${BACK}
    <div class="runner-hud">
      <span class="stat" data-level>Lv 1</span>
      <span class="stat" data-tokens>🪙 0</span>
      <span class="stat" data-gates>🧠 0/0</span>
      <span class="score" data-score>0</span>
    </div>
    <p class="tap-hint">Tap anywhere to jump</p>`
  );
  const gateCard = root.querySelector('.gate-card');
  engine = createEngine(root.querySelector('canvas'), {
    questions: pickRamp(pool),
    onGate: (q) => showStatement(gateCard, q),
    onGateResult: (q, right) => showGateResult(gateCard, q, right),
    onLevel: (level, note) => showLevelUp(root, level, note),
    onOver: (result) => renderResults(result),
  });
  wireControls(root);

  const scoreEl = root.querySelector('[data-score]');
  const tokensEl = root.querySelector('[data-tokens]');
  const gatesEl = root.querySelector('[data-gates]');
  const levelEl = root.querySelector('[data-level]');
  const hud = () => {
    if (!engine) return;
    const { tokens, gatesRight, gatesSeen, level } = engine.stats();
    levelEl.textContent = `Lv ${level}`;
    scoreEl.textContent = engine.score();
    tokensEl.textContent = `🪙 ${tokens}`;
    gatesEl.textContent = `🧠 ${gatesRight}/${gatesSeen}`;
    hudRaf = requestAnimationFrame(hud);
  };
  hud();
}

// Whole-screen tap to jump (except the Back button), plus Space/↑ for testing.
// Removed when the run ends so the save form behaves normally.
function wireControls(root) {
  const down = (e) => {
    if (e.target.closest('.back')) return;
    e.preventDefault();
    engine?.jump();
  };
  const key = (e) => {
    if ((e.code !== 'Space' && e.code !== 'ArrowUp') || e.repeat) return;
    e.preventDefault();
    engine?.jump();
  };
  root.addEventListener('pointerdown', down);
  window.addEventListener('keydown', key);
  cleanup.push(() => {
    root.removeEventListener('pointerdown', down);
    window.removeEventListener('keydown', key);
  });
}

function showLevelUp(root, level, note) {
  root.querySelector('.level-toast')?.remove();
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="level-toast"><strong>Level ${level}</strong>${note ? `<span>${esc(note)}</span>` : ''}</div>`
  );
}

function showStatement(card, q) {
  clearTimeout(gateTimer);
  card.className = 'gate-card';
  card.innerHTML = `
    <p class="gate-meta">${LEVEL_NAMES[q.level] ?? ''} · worth ${GATE_POINTS[q.level] ?? GATE_POINTS[2]}</p>
    <p class="gate-q">${esc(q.text)}</p>
    <p class="gate-how"><span class="fact">↑ Jump = FACT</span><span class="hallu">→ Run under = HALLUCINATION</span></p>`;
  card.hidden = false;
}

function showGateResult(card, q, right) {
  card.className = `gate-card ${right ? 'right' : 'wrong'}`;
  card.innerHTML = `
    <p class="gate-verdict">${right ? `✅ +${GATE_POINTS[q.level] ?? GATE_POINTS[2]} — ` : '🌀 Nope — '}it’s ${q.fact ? 'a FACT' : 'a HALLUCINATION'}</p>
    <p class="gate-why">${esc(q.why)}</p>`;
  gateTimer = setTimeout(() => (card.hidden = true), RESULT_MS);
}

function renderResults(result) {
  const root = document.querySelector('.runner');
  if (!root || !engine) return;
  engine.stop();
  cancelAnimationFrame(hudRaf);
  clearTimeout(gateTimer);
  root.querySelector('.gate-card').hidden = true;
  root.querySelector('.runner-hud')?.remove();
  root.querySelector('.tap-hint')?.remove();
  root.querySelector('.level-toast')?.remove();
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="runner-panel results-panel">
      <div class="results">
        <div>
          <div class="eyebrow">${esc(CAUSES[result.cause] ?? 'Game over')}</div>
          <div class="final-score">${result.score}</div>
          <p class="summary">Level ${result.level} · ${result.metres} m · 🪙 ${result.tokens} tokens · 🧠 ${result.correct}/${result.rounds} gates right</p>
          ${saveCard()}
        </div>
        ${boardCard()}
      </div>
    </div>`
  );
  cleanup.forEach((fn) => fn());
  cleanup = [];
  const { score, correct, rounds } = result;
  wireSaveCard(root, { game: 'runner', result: { score, correct, rounds }, onAgain: play });
}

// ---------- attract mode ----------
// Plays itself (statements and all) while nobody's at the booth. Any tap goes home.

export async function startAttract(context) {
  app = context;
  stopRunner();
  const questions = pickRamp(await loadQuestions());
  const root = mount(shell('attract'));
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="attract-title">
      <img class="badge" src="/perth-ai-badge.webp" alt="Perth AI">
      <div>
        <div class="eyebrow">Perth AI × ${esc(app.config.eventName)}</div>
        <h1>Tap anywhere to play</h1>
      </div>
    </div>
    <div class="board attract-board">
      <h2>Top runners</h2>
      <div data-board><p class="empty">Loading…</p></div>
      ${app.config.game?.prize ? `<p class="attract-prize">🏆 ${esc(app.config.game.prize)}</p>` : ''}
    </div>`
  );
  loadBoard(root.querySelector('[data-board]'), 'runner');
  const gateCard = root.querySelector('.gate-card');
  engine = createEngine(root.querySelector('canvas'), {
    autopilot: true,
    questions,
    onGate: (q) => showStatement(gateCard, q),
    onGateResult: (q, right) => showGateResult(gateCard, q, right),
  });
  root.addEventListener('click', () => app.go('home'));
}

// Top N runners, for the home tile and attract mode.
export function topRunners(limit) {
  return api(`api/scores?game=runner&limit=${limit}`);
}
