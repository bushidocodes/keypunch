// End-to-end test of the REAL built Keypunch app driven through Playwright's
// `_electron` driver, against the in-process mock z/OS FTP/JES server.
//
// It launches the packaged build (out/main/main.js, the root package.json
// `main`), with all FTP I/O really happening in the main process over a TCP
// socket to the mock server. The renderer only talks to main through the
// `window.keypunch` preload bridge.
//
// Journey covered (mirrors the Testing & Verification Protocol):
//   app renders -> Config pane: enter host/port/user/pass
//   -> Results pane (onEnter=pollJobStatus): the seeded JES queue renders
//   -> Explorer pane (onEnter=listDatasets): datasets + members render
//   -> open a member into the editor (member COBOL source loads into Ace)
//   -> Submit ("LOAD"): the job is really STORed to the mainframe
//   -> Disconnect (INTERRUPT): connection indicator clears.
//
// KNOWN PRE-EXISTING LIMITATION (deferred to Phase 4 — react-desktop refresh):
//   The Results pane's react-desktop `MasterDetailsView` throws React 15
//   reconciliation error #120 ("dangerouslyReplaceNodeWithMarkup") when it
//   *re-renders with a changed job list* under modern Chromium, and corrupts
//   the next route transition. This is a react-desktop@0.2.14 + React-15
//   incompatibility, unrelated to the electron-vite/secure-model migration
//   (the components are unchanged). To stay honest, this test:
//     * orders Explorer before the final Results visit (the MasterDetailsView
//       only corrupts transitions AFTER it has rendered a populated list), and
//     * asserts the LOAD submit succeeded by inspecting the AUTHORITATIVE mock
//       server state (the job really lands on the mainframe), rather than the
//       Results DOM, which cannot re-render the grown list on React 15.
//
// Native dialogs (the submit confirmation message box) are stubbed in the MAIN
// process via electronApp.evaluate so the journey runs headless.
//
// NavPane note: the side nav is collapsed (icons only, no text), so nav items
// are addressed by their anchor index: 0=edit, 1=results, 2=explorer, 3=config.

import { test, expect, _electron as electron } from '@playwright/test';
import { fileURLToPath } from 'url';
import { createMockJesServer } from '../mock-server.js';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const electronExe = fileURLToPath(new URL('../../node_modules/electron/dist/electron.exe', import.meta.url));

const NAV = { edit: 0, results: 1, explorer: 2, config: 3 };

let srv;
let port;
let electronApp;
let win;

const nav = (which) => win.locator('a').nth(NAV[which]).click();

test.beforeAll(async () => {
  srv = createMockJesServer();
  port = await srv.listen();

  electronApp = await electron.launch({
    executablePath: electronExe,
    args: ['.'],
    cwd: repoRoot,
    timeout: 45000,
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Stub native dialogs in main so confirmation message boxes auto-accept.
  await electronApp.evaluate(async ({ dialog }) => {
    dialog.showMessageBox = async () => ({ response: 1 }); // always the "action" button
  });

  win = await electronApp.firstWindow();
  await win.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  if (electronApp) await electronApp.close();
  if (srv) await srv.close();
});

test('secure-model runtime assertions', async () => {
  // The renderer must be locked down: no Node, but the preload bridge present.
  const exposes = await win.evaluate(() => ({
    hasBridge: typeof window.keypunch === 'object' && window.keypunch !== null,
    hasJes: !!(window.keypunch && window.keypunch.jes),
    hasOpenFile: !!(window.keypunch && typeof window.keypunch.openFile === 'function'),
    noRequire: typeof window.require === 'undefined',
    noProcess: typeof window.process === 'undefined'
  }));
  expect(exposes.hasBridge).toBe(true);
  expect(exposes.hasJes).toBe(true);
  expect(exposes.hasOpenFile).toBe(true);
  expect(exposes.noRequire).toBe(true);
  expect(exposes.noProcess).toBe(true);

  const secure = await electronApp.evaluate(async ({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    const wp = w.webContents.getLastWebPreferences();
    return { contextIsolation: wp.contextIsolation, nodeIntegration: wp.nodeIntegration };
  });
  expect(secure.contextIsolation).toBe(true);
  expect(secure.nodeIntegration).toBe(false);
});

test('core user journey end to end', async () => {
  srv.reseed();

  // --- App renders: the nav pane (4 items) + status bar present. ---
  await expect(win.locator('#root')).toBeVisible();
  await expect(win.getByText('CONNECT', { exact: true })).toBeVisible();
  await expect(win.locator('a')).toHaveCount(4);

  // --- Config pane: enter the mock connection details. ---
  await nav('config');
  await win.getByPlaceholder('192.168.0.1').fill('127.0.0.1');
  // The FTP port field has no placeholder; it's the 2nd input (initial value '21').
  await win.locator('input').nth(1).fill(String(port));
  await win.getByPlaceholder('Gene.Amdahl').fill('IBMUSER');
  await win.getByPlaceholder('Password').fill('secret');

  // --- Explorer pane (onEnter=listDatasets): datasets + members render. ---
  // Explorer is visited BEFORE Results: the react-desktop MasterDetailsView in
  // Results corrupts the *next* route transition once it has rendered a job
  // list (see header), so Results is the last pane we navigate into.
  await nav('explorer');
  await expect(win.getByText('IBMUSER.JCL').first()).toBeVisible();
  // Expand IBMUSER.SOURCE to reveal its members (HELLO, COBOL1).
  await win.getByText('IBMUSER.SOURCE').first().click();
  await expect(win.getByText('HELLO').first()).toBeVisible();
  await expect(win.getByText('COBOL1').first()).toBeVisible();

  // --- Open a member into the editor: RETR HELLO loads its COBOL source. ---
  await win.getByText('HELLO').first().click();
  await expect(win.locator('.ace_content')).toContainText('PROGRAM-ID', { timeout: 15000 });

  // --- Results pane (onEnter=pollJobStatus): the seeded JES queue renders. ---
  await nav('results');
  await expect(win.getByText('JOB00045').first()).toBeVisible(); // OUTPUT, 3 spool files
  await expect(win.getByText('JOB00046').first()).toBeVisible(); // ACTIVE
  // The connect indicator lights after a successful poll -> INTERRUPT shows.
  await expect(win.getByText('INTERRUPT', { exact: true })).toBeVisible();

  // --- Submit ("LOAD" easy button): the editor contents are really STORed to
  //     the mainframe, creating a new job. We assert against the AUTHORITATIVE
  //     mock server state (see the file header for why not the Results DOM). ---
  expect(Object.keys(srv.state().jobs).sort()).toEqual(['JOB00045', 'JOB00046']);
  await win.getByText('LOAD', { exact: true }).click();
  await expect
    .poll(() => Object.keys(srv.state().jobs).length, { timeout: 15000 })
    .toBeGreaterThan(2);
  expect(Object.keys(srv.state().jobs)).toContain('JOB00100'); // first submitted job

  // --- Disconnect (INTERRUPT): connection tears down, button flips to CONNECT. ---
  const interrupt = win.getByText('INTERRUPT', { exact: true });
  if (await interrupt.count()) {
    await interrupt.click();
    await expect(win.getByText('CONNECT', { exact: true })).toBeVisible();
  }
});
