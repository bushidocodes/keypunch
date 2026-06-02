# Keypunch verification harness

The safety net for the [modernization](../MODERNIZATION.md). It runs on **modern Node**
(≥18) and was the Definition of Done for every phase: a mock z/OS FTP/JES server plus
unit, integration, and Playwright GUI-e2e tests. All of it runs in CI.

> **No database.** Keypunch's only backing state is the z/OS mainframe it talks to over FTP.
> "Reseed the DB" here means **reset the mock FTP/JES server to its baseline fixture**
> ([`fixture.js`](fixture.js)), which `srv.reseed()` does before each test run.

## What's here

| File | Purpose |
|------|---------|
| [`mock-server.js`](mock-server.js) | In-memory mock z/OS FTP/JES server. Speaks the exact commands `app/utils/jesFtp.js` uses (`SITE FILETYPE=JES\|SEQ`, `LIST`, `RETR <jobID>.x`, `STOR`, `DELE`, `CWD`, …). Set `MOCK_DEBUG=1` to log the protocol. |
| [`fixture.js`](fixture.js) | Deterministic seed data (jobs, datasets, members, spool output) + a fresh copy per `reseed()`. |
| [`unit/jesParse.test.js`](unit/jesParse.test.js) | Unit tests for the pure parsers in `app/utils/jesParse.ts`. |
| [`unit/resultsReducer.test.js`](unit/resultsReducer.test.js) | Unit tests for the `results` Redux reducer. |
| [`unit/uiStyleReducer.test.js`](unit/uiStyleReducer.test.js) | Unit tests for the `uiStyle` reducer/actions (incl. the `setColor` regression guard). |
| [`integration/ftpRoundtrip.test.js`](integration/ftpRoundtrip.test.js) | Drives the mock server with the real `promise-ftp` client through Keypunch's command sequences and validates the round-trip through the parsers. **The automated e2e smoke at the protocol layer.** |
| [`e2e/electronE2e.test.js`](e2e/electronE2e.test.js) | **Playwright `_electron` GUI e2e** (enabled in Phase 1 now that Electron is modern). Launches the real *built* app against the mock server and drives the core journey through the UI: render → config → results queue → explorer datasets/members → open a member into the editor → submit. Also asserts the secure model at runtime (`contextIsolation:true`, `nodeIntegration:false`, preload bridge present, no `window.require`/`process`). |
| [`playwright.config.js`](playwright.config.js) | Playwright config for the Electron e2e. |
| [`start-mock.js`](start-mock.js) | Runs the mock server standalone (default port 2121) for manual GUI testing. |
| [`launch-smoke.js`](launch-smoke.js) | Boots the built Electron app (`out/main/main.js`) and asserts it starts without a fatal error. |

## Run the automated suite

```bash
cd harness
npm install        # modern Node (>=18)
npm test           # vitest: unit + integration  (22 tests)

# GUI e2e — requires the app to be built first (repo root: npm run build):
npm run e2e        # Playwright _electron: render + secure-model + core journey

npm run smoke      # boot-only check of the built app
```

## Manual GUI smoke checklist

For a hands-on pass, drive the real app against the mock:

1. Build the app: from the repo root, `npm run build`.
2. Start the mock server: `cd harness && npm run mock` (prints the host/port to use).
3. Launch the app: from the repo root, `npm start` (or `harness && npm run smoke` for a boot-only check).
4. Walk the core journey (reseed = restart `npm run mock` for a clean queue):
   - [ ] **App launches**, main window visible, no errors in the dev console.
   - [ ] **Editor**: type some JCL/source; switch panes and back — content persists.
   - [ ] **Config**: enter `host=127.0.0.1  port=2121  user=IBMUSER  password=anything`.
   - [ ] **Results**: the seeded queue (`JOB00045`, `JOB00046`) renders; retrieve `JOB00045`'s output → spool output renders.
   - [ ] **Submit** ("LOAD" easy button): submit a job → it lands on the mock (`JOB00100`).
   - [ ] **Explorer**: `IBMUSER.SOURCE` / `IBMUSER.JCL` render as a tree; open member `HELLO` → its COBOL source loads into the editor.
   - [ ] **Disconnect** → status indicators clear.
