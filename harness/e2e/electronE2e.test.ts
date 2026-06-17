// End-to-end test of the REAL built Keypunch app driven through Playwright's
// `_electron` driver, against the in-process mock z/OS FTP/JES server.
//
// It launches the packaged build (out/main/main.cjs, the root package.json
// `main`), with all FTP I/O really happening in the main process over a TCP
// socket to the mock server. The renderer only talks to main through the
// `window.keypunch` preload bridge.
//
// Journey covered (mirrors the Testing & Verification Protocol):
//   app renders -> Config pane: enter host/port/user/pass
//   -> Explorer pane (useEffect=listDatasets): datasets + members render
//   -> open a member into the editor (member COBOL source loads into Ace)
//   -> Results pane (useEffect=pollJobStatus): the seeded JES queue renders,
//      and the job IDs (JOB00045 / JOB00046) appear in the Results DOM directly
//   -> Submit ("LOAD"): the job is really STORed to the mainframe
//   -> Disconnect (INTERRUPT): connection indicator clears.
//
// Phase 4 note: react-desktop is gone. The Results pane is now a plain
// list+detail layout, so the React-15 reconciliation error #120 that the old
// MasterDetailsView threw on a growing job list no longer exists. The previous
// workaround (visit Results last, assert only the authoritative mock state
// because the DOM couldn't re-render the grown list) has been removed: we now
// assert the job list directly in the Results DOM AND cross-check the mock state
// after submit.
//
// Native dialogs (the submit confirmation message box) are stubbed in the MAIN
// process via electronApp.evaluate so the journey runs headless.
//
// Nav note: the side nav is icon-only, so nav items are addressed by their
// anchor index: 0=edit, 1=results, 2=explorer, 3=config.

import { test, expect, _electron as electron } from '@playwright/test';
import type { ElectronApplication, Page } from '@playwright/test';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createMockJesServer, type MockJesServer } from '../mock-server';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
// The `electron` package's default export is the path to the platform-correct
// binary (electron.exe on Windows, `electron` on Linux/mac). Resolving it this
// way keeps the e2e cross-platform: works locally on Windows and in CI on Linux
// (xvfb). It resolves up to the repo-root node_modules/electron.
const electronExe = createRequire(import.meta.url)('electron') as string;

const NAV = { edit: 0, results: 1, explorer: 2, config: 3 } as const;

let srv: MockJesServer;
let port: number;
let electronApp: ElectronApplication;
let win: Page;

const nav = (which: keyof typeof NAV) => win.locator('a').nth(NAV[which]).click();

test.beforeAll(async () => {
  srv = createMockJesServer();
  port = await srv.listen();

  electronApp = await electron.launch({
    executablePath: electronExe,
    // On Linux CI the setuid/namespace sandbox often isn't available, so disable
    // it there; locally (Windows/mac) launch normally.
    args: process.platform === 'linux' ? ['--no-sandbox', '.'] : ['.'],
    cwd: repoRoot,
    timeout: 45000,
    env: { ...process.env, NODE_ENV: 'production' }
  });

  // Stub native dialogs in main so confirmation message boxes auto-accept.
  await electronApp.evaluate(async ({ dialog }) => {
    // Always resolve as the "action" button (index 1).
    dialog.showMessageBox = (async () => ({ response: 1, checkboxChecked: false })) as typeof dialog.showMessageBox;
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
  const exposes = await win.evaluate(() => {
    const w = window as typeof window & { require?: unknown; process?: unknown };
    return {
      hasBridge: typeof w.keypunch === 'object' && w.keypunch !== null,
      hasJes: !!(w.keypunch && w.keypunch.jes),
      hasOpenFile: !!(w.keypunch && typeof w.keypunch.openFile === 'function'),
      noRequire: typeof w.require === 'undefined',
      noProcess: typeof w.process === 'undefined'
    };
  });
  expect(exposes.hasBridge).toBe(true);
  expect(exposes.hasJes).toBe(true);
  expect(exposes.hasOpenFile).toBe(true);
  expect(exposes.noRequire).toBe(true);
  expect(exposes.noProcess).toBe(true);

  const secure = await electronApp.evaluate(async ({ BrowserWindow }) => {
    const w = BrowserWindow.getAllWindows()[0];
    // getLastWebPreferences() is a runtime WebContents method that the current
    // Electron type definitions no longer expose; cast to call it unchanged.
    const wp = (w.webContents as unknown as {
      getLastWebPreferences(): { contextIsolation?: boolean; nodeIntegration?: boolean } | null;
    }).getLastWebPreferences();
    return { contextIsolation: wp?.contextIsolation, nodeIntegration: wp?.nodeIntegration };
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

  // --- Explorer pane (useEffect=listDatasets): datasets + members render. ---
  await nav('explorer');
  await expect(win.getByText('IBMUSER.JCL').first()).toBeVisible();
  // Expand IBMUSER.SOURCE to reveal its members (HELLO, COBOL1).
  await win.getByText('IBMUSER.SOURCE').first().click();
  await expect(win.getByText('HELLO').first()).toBeVisible();
  await expect(win.getByText('COBOL1').first()).toBeVisible();

  // --- Open a member into the editor: RETR HELLO loads its COBOL source. ---
  await win.getByText('HELLO').first().click();
  await expect(win.locator('.ace_content')).toContainText('PROGRAM-ID', { timeout: 15000 });

  // --- Results pane (useEffect=pollJobStatus): the seeded JES queue renders.
  //     With react-desktop/#120 gone, the job list is real DOM we can assert. ---
  await nav('results');
  await expect(win.getByText('JOB00045', { exact: true })).toBeVisible(); // OUTPUT, 3 spool files
  await expect(win.getByText('JOB00046', { exact: true })).toBeVisible(); // ACTIVE
  // The connect indicator lights after a successful poll -> INTERRUPT shows.
  await expect(win.getByText('INTERRUPT', { exact: true })).toBeVisible();

  // --- Submit ("LOAD" easy button): the editor contents are really STORed to
  //     the mainframe, creating a new job. Cross-check the authoritative mock
  //     server state in addition to the DOM. ---
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
