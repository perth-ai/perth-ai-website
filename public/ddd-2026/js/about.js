// "Meet Perth AI" — the booth spiel as swipeable cards, so whoever's at the
// booth can walk a visitor through it on a tablet. Content comes from the
// Perth AI @ DDD 2026 deck. Swipe, tap the arrows, or use ← → on a keyboard.

import { esc, mount, SKY, BACK, qrCard } from './ui.js';

const GROUPS = [
  { title: 'Builders, startups & students', points: ['Co-building sessions', 'Hands-on workshops', 'Honest feedback on your idea'] },
  { title: 'Product & engineering', points: ['Evals, agents, context engineering', 'Non-deterministic product patterns', 'Show-and-tell from shipping teams'] },
  { title: 'AI-first enterprise', points: ['Real rollouts, including the sideways ones', 'Governance, risk, change management', 'Peers from other WA organisations'] },
];

const FORMATS = [
  ['Meet-ups', 'Speakers & panels'],
  ['Co-building', 'Bring your own project'],
  ['Workshops', 'Laptops open'],
  ['Networking', 'Cafes & Friday drinks'],
  ['Pop-ups', 'Short notice'],
  ['Big events', 'Conferences & hackathons'],
  ['Touch grass', 'Bush walks & AI run club'],
  ['Free', 'Or close to it'],
];

const VALUES = [
  'Show the work',
  'Everyone starts somewhere',
  'Honest about the hard parts',
  'Free and open where we can be',
  'Local, not parochial',
  'Give first, no hard sell',
  'Experts and beginners, same room',
  'Build like it matters',
];

const STEPS = ['Register on Luma', 'Turn up on your own', 'Stay for the bit after'];

const HAND_UP = [
  { form: 'idea', title: 'Suggest an event', points: ['Dreamer sessions', 'Study groups', 'Regular co-builds'] },
  { form: 'space', title: 'Offer a space', points: ['30 to 60 people', 'A weeknight after six', 'Our biggest constraint'] },
  { form: 'sponsor', title: 'Sponsor', points: ['Venue, food, prizes, credits', 'Keeps events free', 'Meet builders, not a list'] },
];

const TEAM = [
  ['Susannah Soon', 'President & Founder'],
  ['Timothy de Boer', 'Vice President & Founder'],
  ['Will Webster', 'Founder, Sponsorship'],
  ['Kristina Gagalova', 'Founder, Volunteers'],
  ['Rajat Saddi', 'Founder, Workshops & Automation'],
  ['Rafael Avigad', 'Founder, Website & Automation'],
];

const initials = (name) => name.split(' ').filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).join('').slice(0, 2);
const bullets = (points) => `<ul>${points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`;

const cards = (config) => [
  `<div class="card-hero">
     <div class="hero-logos">
       <img class="badge" src="/perth-ai-badge.webp" alt="Perth AI">
       <span class="logo-chip"><img src="assets/partners/ddd-perth.png" alt="DDD Perth"></span>
     </div>
     <div class="eyebrow">Perth AI @ DDD Perth 2026 · 3 October</div>
     <h1>The people building with AI in Perth, <span class="hl-azure">in one room.</span></h1>
     <p class="sub">Perth is a long way from everywhere. <span class="hl-orchid">That’s an advantage.</span></p>
   </div>`,

  `<div class="card-statement">
     <div class="eyebrow">Why Perth AI exists</div>
     <p class="statement">Learn in the open. Meet the people doing it well. <span class="hl-azure">Ship better work.</span></p>
   </div>`,

  `<h2>Multiple groups, <span class="hl-azure">one community</span></h2>
   <div class="boxes three">
     ${GROUPS.map((g) => `<div class="card-box"><h3>${esc(g.title)}</h3>${bullets(g.points)}</div>`).join('')}
   </div>`,

  `<h2>What we run</h2>
   <div class="boxes four">
     ${FORMATS.map(([t, s], i) => `<div class="card-box${i === FORMATS.length - 1 ? ' box-hl' : ''}"><h3>${esc(t)}</h3><p>${esc(s)}</p></div>`).join('')}
   </div>`,

  `<h2>What we <span class="hl-azure">care about</span></h2>
   <div class="boxes four">
     ${VALUES.map((v, i) => `<div class="card-box"><span class="num">${String(i + 1).padStart(2, '0')}</span><h3>${esc(v)}</h3></div>`).join('')}
   </div>`,

  `<h2>First time?</h2>
   <ol class="steps">
     ${STEPS.map((s, i) => `<li><span class="big-num n${i + 1}">${String(i + 1).padStart(2, '0')}</span><strong>${esc(s)}</strong></li>`).join('')}
   </ol>
   <div class="card-row">
     ${qrCard(config.links, { key: 'luma', label: 'Scan for upcoming events', caption: 'luma.com/perthai' })}
     <button class="btn btn-primary" data-action="form" data-arg="events">See what’s on →</button>
   </div>`,

  `<div class="card-summit">
     <div>
       <div class="eyebrow">Flagship event</div>
       <h2>AI Disrupt <span class="hl-azure">Summit 2026</span></h2>
       <div class="tags">
         <span class="tag t-azure">Demos over slides.</span>
         <span class="tag t-orchid">Leave the sales deck at home.</span>
       </div>
     </div>
     <dl class="facts">
       <div><dt><i class="dot d-azure"></i>When</dt><dd>December 2026</dd></div>
       <div><dt><i class="dot d-orchid"></i>Part of</dt><dd>West Tech Fest</dd></div>
       <div><dt><i class="dot d-coral"></i>Format</dt><dd>Talks, demos, hard questions</dd></div>
     </dl>
   </div>
   <div class="card-row">
     <button class="btn btn-primary" data-action="summit">Sponsor, host or speak →</button>
   </div>`,

  `<h2>Put your <span class="hl-azure">hand up</span></h2>
   <div class="boxes three">
     ${HAND_UP.map(
       (h, i) => `
       <button class="card-box box-action" data-action="form" data-arg="${h.form}">
         <span class="num">${String(i + 1).padStart(2, '0')}</span>
         <h3>${esc(h.title)}</h3>
         ${bullets(h.points)}
         <span class="go" aria-hidden="true">→</span>
       </button>`
     ).join('')}
   </div>`,

  `<h2>Run by <span class="hl-azure">volunteers</span></h2>
   <div class="boxes three people">
     ${TEAM.map(([name, role], i) => `<div class="card-box person"><span class="avatar a${i % 3}">${initials(name)}</span><div><h3>${esc(name)}</h3><p>${esc(role)}</p></div></div>`).join('')}
   </div>
   <div class="supported">
     <span>Supported by</span>
     <span class="logo-chip"><img src="assets/partners/wa-data-science-innovation-hub.png" alt="WA Data Science Innovation Hub"></span>
   </div>`,

  `<h2>Just <span class="hl-azure">ship it.</span></h2>
   <div class="qr-cards">
     ${qrCard(config.links, { key: 'luma', label: 'Events', caption: 'luma.com/perthai' })}
     ${qrCard(config.links, { key: 'slack', label: 'Slack', caption: 'Join the chat' })}
     ${qrCard(config.links, { key: 'linkedin', label: 'LinkedIn', caption: 'Follow Perth AI' })}
   </div>
   <p class="contacts">${esc(config.links.email ?? '')} · perthai.org</p>
   <p class="acknowledgement">Perth AI meets on the lands of the Whadjuk people of the Noongar nation.</p>`,
];

let cleanup = () => {};

export function stopAbout() {
  cleanup();
  cleanup = () => {};
}

export function renderAbout({ config, card = 0 }) {
  stopAbout();
  const list = cards(config);
  const root = mount(`
    <section class="view sky about">
      ${SKY}
      ${BACK}
      <div class="about-count" aria-live="polite"></div>
      <div class="about-track">
        ${list.map((html, i) => `<article class="about-card" aria-label="${i + 1} of ${list.length}"><div class="about-inner">${html}</div></article>`).join('')}
      </div>
      <nav class="about-nav">
        <button class="btn btn-ghost" data-prev aria-label="Previous">←</button>
        <div class="about-dots">${list.map((_, i) => `<button data-dot="${i}" aria-label="Card ${i + 1}"></button>`).join('')}</div>
        <button class="btn btn-primary" data-next>Next →</button>
      </nav>
    </section>`);

  const track = root.querySelector('.about-track');
  const count = root.querySelector('.about-count');
  const dots = [...root.querySelectorAll('[data-dot]')];
  const next = root.querySelector('[data-next]');
  const last = list.length - 1;
  let index = -1;

  const show = (i) => {
    if (i === index) return;
    index = i;
    count.textContent = `${i + 1} / ${list.length}`;
    dots.forEach((d, j) => d.classList.toggle('on', j === i));
    root.querySelector('[data-prev]').disabled = i === 0;
    next.textContent = i === last ? 'Done' : 'Next →';
  };
  const goTo = (i) => track.scrollTo({ left: Math.max(0, Math.min(last, i)) * track.clientWidth, behavior: 'smooth' });

  // Swiping scrolls the track natively; this just keeps the counter in step.
  let frame;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => show(Math.round(track.scrollLeft / track.clientWidth)));
  });

  root.querySelector('[data-prev]').addEventListener('click', () => goTo(index - 1));
  next.addEventListener('click', () => (index === last ? root.querySelector('[data-action="home"]').click() : goTo(index + 1)));
  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

  const onKey = (e) => {
    if (e.key === 'ArrowRight') goTo(index + 1);
    if (e.key === 'ArrowLeft') goTo(index - 1);
  };
  document.addEventListener('keydown', onKey);
  cleanup = () => document.removeEventListener('keydown', onKey);

  const start = Math.max(0, Math.min(last, Number(card) || 0));
  show(start);
  if (start) requestAnimationFrame(() => track.scrollTo({ left: start * track.clientWidth }));
}
