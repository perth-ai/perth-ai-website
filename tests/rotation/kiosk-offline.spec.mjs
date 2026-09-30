// Wifi drop-outs at the booth (/ddd-2026), run in GitHub Actions with the rest
// of the kiosk checks. Scores and sign-ups are saved on the device and sent
// once the network is back, exactly once, and a device that reloads while
// offline still opens the kiosk. Nothing here reaches the real Web3Forms: every
// request to it is answered by the test.
import { test, expect } from '@playwright/test';

const CONFIG = {
  eventName: 'DDD Perth 2026', eventDate: '3 October', idleSeconds: 0, attractSeconds: 0,
  onScreenKeyboard: false, game: {}, links: {}, team: [],
  forms: { endpoint: 'https://api.web3forms.com/submit', accessKey: 'test-key', subjectPrefix: 'DDD Perth 2026 booth', fromName: 'Perth AI booth' },
};

const queued = (page, key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || '[]').length, key);
const backOnline = (page) => page.evaluate(() => dispatchEvent(new Event('online')));

test.describe('with the network faked', () => {
  let online;
  let posts;
  let signups;

  test.beforeEach(async ({ page }) => {
    online = false;
    posts = [];
    signups = [];
    await page.route('**/api/config.json', (r) => r.fulfill({ json: CONFIG }));
    await page.route((url) => url.pathname.endsWith('/api/scores'), (route) => {
      if (route.request().method() !== 'POST') return route.fulfill({ json: [] });
      if (!online) return route.abort('internetdisconnected');
      posts.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true, id: 1, rank: 1, best: 100, bestId: 1 } });
    });
    await page.route('https://api.web3forms.com/**', (route) => {
      if (!online) return route.abort('internetdisconnected');
      signups.push(route.request().postDataJSON());
      return route.fulfill({ json: { success: true } });
    });
  });

  test('a score saved offline shows as saved, then reaches the board once', async ({ page }) => {
    await page.goto('/ddd-2026/#runner');
    await page.waitForSelector('.btn-start');
    // The results card, as runner.js shows it after a run.
    await page.evaluate(async () => {
      const m = await import('/ddd-2026/js/scoreboard.js');
      const root = document.querySelector('.runner');
      root.insertAdjacentHTML('beforeend', `<div class="runner-panel results-panel"><div class="results"><div>${m.saveCard()}</div>${m.boardCard()}</div></div>`);
      m.wireSaveCard(root, { game: 'runner', result: { score: 100, correct: 1, rounds: 1, playedAt: new Date().toISOString() }, onAgain() {} });
    });
    await page.fill('#f-name', 'Tess');
    await page.click('form.save-card [type=submit]');

    await expect(page.locator('.save-card h3')).toHaveText('Saved, Tess!');
    await expect(page.getByText(/grab someone/i)).toHaveCount(0);
    expect(await queued(page, 'perthai-kiosk-scores')).toBe(1);

    online = true;
    await backOnline(page);
    await expect.poll(() => posts.length).toBe(1);
    expect(posts[0]).toMatchObject({ name: 'Tess', score: 100 });
    expect(posts[0].clientId).toBeTruthy();
    await expect.poll(() => queued(page, 'perthai-kiosk-scores')).toBe(0);

    // Coming back online again sends nothing more.
    await backOnline(page);
    await page.waitForTimeout(500);
    expect(posts).toHaveLength(1);
  });

  test('a sign-up made offline gets its thanks, then arrives with the booth subject', async ({ page }) => {
    await page.goto('/ddd-2026/#form/slack');
    await page.fill('#f-name', 'Tess Tester');
    await page.fill('#f-email', 'tess@example.com');
    await page.click('.form-panel [type=submit]');

    await expect(page.locator('.thanks h1')).toHaveText('Thanks, Tess!');
    expect(await queued(page, 'perthai-kiosk-outbox')).toBe(1);

    online = true;
    await backOnline(page);
    await expect.poll(() => signups.length).toBe(1);
    expect(signups[0]).toMatchObject({
      subject: 'DDD Perth 2026 booth: Join the Slack',
      from_name: 'Perth AI booth',
      access_key: 'test-key',
      email: 'tess@example.com',
      event_updates: 'No',
    });
    await expect.poll(() => queued(page, 'perthai-kiosk-outbox')).toBe(0);
  });
});

test.describe('with the service worker', () => {
  test.use({ serviceWorkers: 'allow' });

  test('a reload while offline still opens the kiosk', async ({ page, context }) => {
    await page.goto('/ddd-2026/');
    await page.waitForSelector('.home h1');
    // Wait until the service worker controls the page and has stored the kiosk.
    await page.waitForFunction(async () => {
      if (!navigator.serviceWorker.controller) return false;
      const cache = await caches.open('ddd2026-v1');
      return Boolean(await cache.match('/ddd-2026/js/app.js'));
    });

    // Every request the service worker makes now fails, as with the wifi down.
    // (context.setOffline would also stop the page reaching its own service
    // worker, which a real device never does.)
    await context.route('**/*', (route) => route.abort('internetdisconnected'));
    await page.reload();
    await expect(page.locator('.home h1')).toContainText('Perth AI');
    // Proof the network really is down: anything not stored fails.
    const uncached = await page.evaluate(() => fetch(`/ddd-2026/not-stored-${Date.now()}.json`).then(() => 'loaded', () => 'failed'));
    expect(uncached).toBe('failed');
    await page.click('[data-action="runner"]');
    await expect(page.locator('.btn-start')).toBeVisible();
  });
});
