import { defineConfig } from '@playwright/test';

// Playwright config for the Electron end-to-end test. The e2e launches the
// REAL built app (out/main/main.cjs) via Playwright's `_electron` driver and
// drives the UI against the in-process mock JES server. No browser download is
// needed — `_electron.launch` uses the app's own Electron binary.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.test.js',
  globalSetup: './e2e/global-setup.js',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']]
});
