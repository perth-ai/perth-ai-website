// The prize draw on the booth screen (/ddd-2026, js/draw.js), run in GitHub
// Actions with the other kiosk checks. The API is faked: the server picks the
// winners, and these check the screen shows the right ones, stops the wheel on
// them, and only takes over a booth device that nobody's using.
import { test, expect } from '@playwright/test';

const CONFIG = {
  eventName: 'DDD Perth 2026', eventDate: '3 October', idleSeconds: 60, attractSeconds: 0,
  onScreenKeyboard: false, game: { drawPrize: 'a choc quokka' }, links: {}, team: [], forms: {},
};
const NAMES = ['Priya', 'Tom', 'Aisha', 'Jordan', 'Mei', 'Liam', 'Zara', 'Ollie', 'Chloe', 'Raj', 'Nina', 'Ben'];
const DRAW = { id: 7, kind: 'draw', names: NAMES, winners: [{ name: 'Chloe', score: 900 }, { name: 'Ollie', score: 800 }], ageSeconds: 5 };

test.beforeEach(async ({ page }) => {
  await page.route('**/api/config.json', (r) => r.fulfill({ json: CONFIG }));
  await page.route('**/api/scores**', (r) => r.fulfill({ json: [] }));
  await page.route('**/api/draws/latest', (r) => r.fulfill({ json: DRAW }));
});

// The name on the slice right under the pointer's tip, from the page's own layout.
const underPointer = (page) =>
  page.evaluate(() => {
    const p = document.querySelector('.wheel-pointer').getBoundingClientRect();
    const hit = document.elementsFromPoint(p.left + p.width / 2, p.bottom + 14).find((e) => e.matches('.wheel path, .wheel circle:not(.wheel-rim):not(.wheel-hub)'));
    return hit?.nextElementSibling?.textContent ?? null;
  });

test('the wheel stops on each winner the server drew, then shows them all', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/ddd-2026/#draw');

  await expect(page.locator('[data-title]')).toHaveText('🎉 Chloe!', { timeout: 15_000 });
  expect(await underPointer(page)).toBe('Chloe');
  await expect(page.locator('[data-title]')).toHaveText('🎉 Ollie!', { timeout: 15_000 });
  expect(await underPointer(page)).toBe('Ollie');

  await expect(page.locator('[data-title]')).toHaveText('Our winners!');
  await expect(page.locator('[data-winners] li')).toHaveText(['Chloe', 'Ollie']);
  await expect(page.locator('[data-collect]')).toContainText('a choc quokka');
  // The whole wheel is on screen.
  const wheel = await page.locator('.wheel-wrap').boundingBox();
  expect(wheel.y).toBeGreaterThanOrEqual(0);
  expect(wheel.y + wheel.height).toBeLessThanOrEqual(1080);
});

test('a booth device on its home screen shows a new draw by itself', async ({ page }) => {
  await page.goto('/ddd-2026/?booth');
  await expect(page.locator('.draw')).toBeVisible({ timeout: 10_000 });
});

test('a booth device someone is using is left alone', async ({ page }) => {
  await page.goto('/ddd-2026/?booth#form/slack');
  await page.waitForTimeout(7000); // more than one check for new draws
  await expect(page.locator('.draw')).toHaveCount(0);
  await expect(page.locator('.form-view')).toBeVisible();
});

test('a mobile that isn’t a phone number is caught before saving', async ({ page }) => {
  await page.goto('/ddd-2026/?booth=0#runner');
  await page.waitForSelector('.btn-start');
  await page.evaluate(async () => {
    const m = await import('/ddd-2026/js/scoreboard.js');
    const root = document.querySelector('.runner');
    root.insertAdjacentHTML('beforeend', `<div class="runner-panel results-panel"><div class="results"><div>${m.saveCard()}</div>${m.boardCard()}</div></div>`);
    m.wireSaveCard(root, { game: 'runner', result: { score: 100, correct: 1, rounds: 1, playedAt: new Date().toISOString() }, onAgain() {} });
  });
  await page.fill('#f-name', 'Tess');
  await page.fill('#f-phone', '12ab');
  await page.click('form.save-card [type=submit]');
  await expect(page.locator('[data-field="phone"] .error')).toHaveText('That number doesn’t look right');
});
