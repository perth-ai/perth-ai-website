// Service worker for the DDD Perth 2026 booth kiosk. See docs/ddd-2026.md.
//
// It keeps a copy of the kiosk on the device so that a reload while the venue
// wifi is down (an iPad reopening the home-screen app, Android discarding a
// background tab) still opens the kiosk instead of the browser's "no internet"
// page. It also makes the kiosk installable as an app on Android.
//
// Network first for everything that can change (pages, code, config, the
// leaderboard): an online device always gets the latest version, and the
// stored copy is only used when the network fails or takes longer than
// NETWORK_WAIT_MS. Images and fonts, which don't change, come from the copy.
//
// Never stored: anything that isn't a GET (score saves, sign-ups), other
// sites (Web3Forms), and the admin API, whose answers hold visitors' emails.
//
// Switch it off on a device with ?sw=0 on the kiosk URL. To switch it off
// everywhere, replace this file with one that calls self.registration.unregister().

const VERSION = 'ddd2026-v1';
const NETWORK_WAIT_MS = 4000;

// Everything the kiosk needs to open and play offline, stored on install. A
// file missing from this list is still stored the first time it's used.
const PRECACHE = [
  './',
  'manifest.webmanifest',
  'css/styles.css', 'css/game.css', 'css/runner.css', 'css/summit.css', 'css/about.css', 'css/keyboard.css',
  'js/app.js', 'js/ui.js', 'js/queue.js', 'js/outbox.js', 'js/forms.js', 'js/keyboard.js', 'js/scoreboard.js',
  'js/scoring.js', 'js/runner.js', 'js/questions.js', 'js/sprites.js', 'js/summit.js', 'js/about.js',
  'game/questions.json',
  'api/config.json',
  'api/qr/luma.svg', 'api/qr/slack.svg', 'api/qr/linkedin.svg',
  'assets/fonts/inter.woff2', 'assets/fonts/space-grotesk.woff2',
  'assets/partners/ddd-perth.png', 'assets/partners/wa-data-science-innovation-hub.png',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/icon-maskable-512.png',
  // Shared with the rest of the site.
  '/perth-ai-badge.webp', '/perth-ai-mark.webp', '/perth-skyline.webp', '/favicon-32.png', '/apple-touch-icon.png',
  '/summit/2025/opening.webp', '/summit/2025/main-room.webp', '/summit/2025/speaker.webp',
  '/summit/2025/startup-expo.webp', '/summit/2025/hackathon.webp', '/summit/2025/hackathon-prizes.webp',
  '/summit/2025/courtyard.webp',
];

const KIOSK = new URL('./', self.location).pathname; // "/ddd-2026/"
const SHARED_ASSET = /\.(webp|png|jpg|svg|woff2)$/;

self.addEventListener('install', (event) => {
  // Each file on its own, so one missing file can't stop the rest being stored.
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ddd2026-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith(`${KIOSK}api/admin`)) return;

  const inKiosk = url.pathname.startsWith(KIOSK) || url.pathname === KIOSK.slice(0, -1);
  if (SHARED_ASSET.test(url.pathname) && !url.pathname.startsWith(`${KIOSK}api/`)) {
    event.respondWith(fromCache(request));
  } else if (inKiosk) {
    event.respondWith(fromNetwork(request));
  }
  // Anything else (the main site) is left alone.
});

// Pages are stored without their query string, so /ddd-2026/?booth and
// /ddd-2026/ share one copy.
const cacheKey = (request) => {
  if (request.mode !== 'navigate') return request;
  const url = new URL(request.url);
  url.search = '';
  return url.href;
};

async function store(request, response) {
  if (!response.ok || response.type !== 'basic' || response.redirected) return;
  const cache = await caches.open(VERSION);
  await cache.put(cacheKey(request), response);
}

async function fromNetwork(request) {
  const network = fetch(request).then((response) => {
    store(request, response.clone()).catch(() => {});
    return response;
  });
  network.catch(() => {}); // a failure after the stored copy was used isn't an error
  const stored = () => caches.match(cacheKey(request), { ignoreSearch: request.mode === 'navigate' });
  // Slow wifi: after NETWORK_WAIT_MS, use the stored copy if there is one,
  // and let the network carry on in the background to refresh it.
  const slow = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT_MS)).then(stored);
  try {
    const first = await Promise.race([network, slow]);
    if (first) return first;
    return await network;
  } catch {
    const copy = await stored();
    if (copy) return copy;
    throw new Error('Offline and not stored');
  }
}

async function fromCache(request) {
  const copy = await caches.match(request);
  if (copy) return copy;
  const response = await fetch(request);
  store(request, response.clone()).catch(() => {});
  return response;
}
