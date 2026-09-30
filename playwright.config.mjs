import { defineConfig } from '@playwright/test';
// Serves public/ so /ddd-2026/?booth loads as in production.
export default defineConfig({
  testDir: 'tests/rotation',
  timeout: 45000,
  // The tests fake the API with page.route, which doesn't see requests the
  // kiosk's service worker makes, so keep it out of the way here.
  use: { baseURL: 'http://127.0.0.1:4321', serviceWorkers: 'block' },
  webServer: {
    command: 'npx --yes http-server public -p 4321 -s',
    url: 'http://127.0.0.1:4321/ddd-2026/?booth',
    reuseExistingServer: false,
    timeout: 60000,
  },
});
