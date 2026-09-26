// AI Disrupt — Perth AI's annual summit. A photo slideshow from 2025 plus the
// ways in: sponsor, host the venue, speak, or get notified about 2026.
//
// Facts, stats and photos come from perthai.org/summit. Like that page, alt
// text describes what's in frame without naming anyone (nobody in the photos
// has been identified), and there's no photo credit (unconfirmed).

import { esc, mount, SKY, BACK } from './ui.js';

const PHOTOS = [
  { src: 'opening', alt: 'A speaker opening the summit in front of a large AI Disrupt Summit 2025 title slide.' },
  { src: 'main-room', alt: 'A packed hall of attendees seated at round tables between sessions.' },
  { src: 'speaker', alt: 'A speaker presenting to a seated audience alongside a projected slide.' },
  { src: 'startup-expo', alt: 'Two attendees talking beside a startup banner at the expo.' },
  { src: 'hackathon', alt: 'Hackathon teams working on laptops at long shared tables.' },
  { src: 'hackathon-prizes', alt: 'Two people on stage holding prizes in front of a hackathon results slide.' },
  { src: 'courtyard', alt: 'Attendees talking outside on the lawn with drinks during a break.' },
];

const STATS = [
  { figure: '180+', label: 'builders, founders, students and investors' },
  { figure: '15', label: 'AI startups at the expo' },
  { figure: '5', label: 'hackathon teams' },
];

// Sponsors, a venue and speakers are what 2026 needs most, so they lead.
const ACTIONS = [
  { form: 'summitSponsor', title: 'Sponsor AI Disrupt', blurb: 'Food, prizes, credits or a headline spot — keep it free to attend.' },
  { form: 'summitVenue', title: 'Host the venue', blurb: 'Got a main room and space for an expo? Be the venue sponsor.' },
  { form: 'summitSpeak', title: 'Speak or demo', blurb: 'Call for speakers is open. Demos over slides. First-timers very welcome.' },
  { form: 'summitNotify', title: 'Get notified', blurb: 'Hear first when the date, venue and tickets are locked in.', minor: true },
];

const SLIDE_MS = 5000;
let slideTimer;

export function stopSummit() {
  clearInterval(slideTimer);
}

// The site's own copies of the 2025 photos (public/summit/2025/), the same ones /summit uses.
export const summitPhoto = (name) => `/summit/2025/${name}.webp`;

export function renderSummit() {
  stopSummit();
  const root = mount(`
    <section class="view sky summit">
      ${SKY}
      ${BACK}
      <div class="summit-layout">
        <figure class="summit-photos">
          ${PHOTOS.map(
            (p, i) => `<img src="${summitPhoto(p.src)}" alt="${esc(p.alt)}" class="${i === 0 ? 'on' : ''}">`
          ).join('')}
          <figcaption>AI Disrupt Summit 2025, St Catherine’s College, Curtin University.</figcaption>
        </figure>
        <div class="summit-info">
          <div class="eyebrow">Perth AI’s signature event</div>
          <h1>AI Disrupt <span class="accent">2026</span></h1>
          <p class="lede">One day, once a year, where everyone in Perth building with AI ends up in the same building. Talks, a startup expo, a hackathon and workshops — then drinks in the courtyard.</p>
          <p class="when">📅 December 2026</p>
          <dl class="summit-stats">
            ${STATS.map((s) => `<div><dt>${esc(s.figure)}</dt><dd>${esc(s.label)}</dd></div>`).join('')}
          </dl>
          <p class="stats-note">at the 2025 summit</p>
          <div class="summit-actions">
            ${ACTIONS.map(
              (a) => `
              <button class="summit-action${a.minor ? ' minor' : ''}" data-action="form" data-arg="${esc(a.form)}">
                <strong>${esc(a.title)}</strong>
                <span>${esc(a.blurb)}</span>
                <span class="go" aria-hidden="true">→</span>
              </button>`
            ).join('')}
          </div>
        </div>
      </div>
    </section>`);

  const slides = [...root.querySelectorAll('.summit-photos img')];
  let current = 0;
  slideTimer = setInterval(() => {
    slides[current].classList.remove('on');
    current = (current + 1) % slides.length;
    slides[current].classList.add('on');
  }, SLIDE_MS);
}
