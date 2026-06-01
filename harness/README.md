# Keypunch verification harness (Phase 0)

The safety net for the [modernization](../MODERNIZATION.md). It runs on **modern Node**
(≥18), decoupled from the app's legacy Node-10 build, and is reused as the Definition of
Done for every later phase.

> **No database.** Keypunch's only backing state is the z/OS mainframe it talks to over FTP.
> "Reseed the DB" here means **reset the mock FTP/JES server to its baseline fixture**
> ([`fixture.js`](fixture.js)), which `srv.reseed()` does before each test run.

## What's here

| File | Purpose |
|------|---------|
| [`mock-server.js`](mock-server.js) | In-memory mock z/OS FTP/JES server. Speaks the exact commands `app/utils/jesFtp.js` uses (`SITE FILETYPE=JES\|SEQ`, `LIST`, `RETR <jobID>.x`, `STOR`, `DELE`, `CWD`, …). Set `MOCK_DEBUG=1` to log the protocol. |
| [`fixture.js`](fixture.js) | Deterministic seed data (jobs, datasets, members, spool output) + a fresh copy per `reseed()`. |
| [`unit/jesParse.test.js`](unit/jesParse.test.js) | Unit tests for the pure parsers extracted to `app/utils/jesParse.js`. |
| [`unit/resultsReducer.test.js`](unit/resultsReducer.test.js) | Unit tests for the `results` Redux reducer. |
| [`integration/ftpRoundtrip.test.js`](integration/ftpRoundtrip.test.js) | Drives the mock server with the real `promise-ftp` client through Keypunch's command sequences and validates the round-trip through the parsers. **This is the automated e2e smoke at the protocol layer.** |
| [`start-mock.js`](start-mock.js) | Runs the mock server standalone (default port 2121) for manual GUI testing. |
| [`launch-smoke.js`](launch-smoke.js) | Boots the built Electron app and asserts it starts without a fatal error. |

## Run the automated suite

```bash
cd harness
npm install        # modern Node (>=18)
npm test           # vitest: unit + integration  (16 tests)
```

## Manual GUI smoke checklist

Full GUI automation (Playwright `_electron`) lands in **Phase 5** — Electron 1.8 predates
Playwright's Electron driver. Until then, drive the real app by hand against the mock:

1. Build the app on Node 10 (see [root README](../README.md#running-on-a-modern-machine-verified-june-2026)).
2. Start the mock server: `cd harness && npm run mock` (prints the host/port to use).
3. Launch the app: from the repo root, `npm start` (or `harness && npm run smoke` for a boot-only check).
4. Walk the core journey (reseed = restart `npm run mock` for a clean queue):
   - [ ] **App launches**, main window visible, no errors in the dev console.
   - [ ] **Editor**: type some JCL/source; switch panes and back — content persists.
   - [ ] **Config**: enter `host=127.0.0.1  port=2121  user=IBMUSER  password=anything`; connect → "connected" indicator lights.
   - [ ] **Submit** ("easy button"): submit a job → it appears in Results.
   - [ ] **Results**: the seeded queue (`JOB00045`, `JOB00046`) renders; retrieve `JOB00045`'s output → spool output renders.
   - [ ] **Explorer**: `IBMUSER.SOURCE` / `IBMUSER.JCL` render as a tree; open member `HELLO` → its COBOL source loads into the editor.
   - [ ] **Disconnect** → all status indicators clear.
