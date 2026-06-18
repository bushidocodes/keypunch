# Keypunch verification harness

The safety net for the modernization. It runs on **modern Node**
(≥18), is written in **TypeScript**, and was the Definition of Done for every phase: a mock
z/OS FTP/JES server plus unit, integration, and Playwright GUI-e2e tests. All of it runs in CI.

> **No database.** Keypunch's only backing state is the z/OS mainframe it talks to over FTP.
> "Reseed the DB" here means **reset the mock FTP/JES server to its baseline fixture**
> ([`fixture.ts`](fixture.ts)), which `srv.reseed()` does before each test run.

## What's here

| File | Purpose |
|------|---------|
| [`mock-server.ts`](mock-server.ts) | In-memory mock z/OS FTP/JES server. Speaks the exact commands `app/utils/jesFtp.ts` uses (`SITE FILETYPE=JES\|SEQ`, `LIST`, `RETR <jobID>.x`, `STOR`, `DELE`, `CWD`, …). Set `MOCK_DEBUG=1` to log the protocol. |
| [`fixture.ts`](fixture.ts) | Deterministic seed data (jobs, datasets, members, spool output) + a fresh copy per `reseed()`. |
| [`unit/*.test.ts`](unit/) | Unit tests for the pure parsers in `app/utils/jesParse.ts` and for every Redux reducer/action. |
| [`component/*.test.tsx`](component/) | React component tests (Testing Library + jsdom) for the renderer panes, plus [`component/jesFtp.test.ts`](component/jesFtp.test.ts) for the renderer-side JES client. |
| [`integration/ftpRoundtrip.test.ts`](integration/ftpRoundtrip.test.ts) | Drives the mock server with the real `basic-ftp` client through Keypunch's command sequences and validates the round-trip through the parsers. **The automated e2e smoke at the protocol layer.** |
| [`e2e/electronE2e.test.ts`](e2e/electronE2e.test.ts) | **Playwright `_electron` GUI e2e** (enabled in Phase 1 now that Electron is modern). Launches the real *built* app against the mock server and drives the core journey through the UI: render → config → results queue → explorer datasets/members → open a member into the editor → submit. Also asserts the secure model at runtime (`contextIsolation:true`, `nodeIntegration:false`, preload bridge present, no `window.require`/`process`). |
| [`playwright.config.ts`](playwright.config.ts) | Playwright config for the Electron e2e. |
| [`vitest.config.ts`](vitest.config.ts) | Vitest config (node + jsdom environments, react-ace/ace-builds stubs). |
| [`tsconfig.json`](tsconfig.json) | Harness TypeScript config — extends the root config and adds the vitest globals. |
| [`start-mock.ts`](start-mock.ts) | Runs the mock server standalone (default port 2121) for manual GUI testing. |
| [`launch-smoke.ts`](launch-smoke.ts) | Boots the built Electron app (`out/main/main.cjs`) and asserts it starts without a fatal error. |

## Run the automated suite

```bash
cd harness
# deps are installed by the root `pnpm install` (harness is a workspace package)
pnpm typecheck     # tsc --noEmit over the harness (+ the app modules it imports)
pnpm test          # vitest: unit + integration + component (125 tests)

# GUI e2e — requires the app to be built first (repo root: pnpm build):
pnpm e2e           # Playwright _electron: render + secure-model + core journey

pnpm smoke         # boot-only check of the built app
```

## Manual GUI smoke checklist

For a hands-on pass, drive the real app against the mock:

1. Install deps and build: from the repo root, `pnpm install && pnpm build`.
2. Start the mock server: `cd harness && pnpm mock` (prints the host/port to use).
3. Launch the app: from the repo root, `pnpm start` (or `cd harness && pnpm smoke` for a boot-only check).
4. Walk the core journey (reseed = restart `npm run mock` for a clean queue):
   - [ ] **App launches**, main window visible, no errors in the dev console.
   - [ ] **Editor**: type some JCL/source; switch panes and back — content persists.
   - [ ] **Config**: enter `host=127.0.0.1  port=2121  user=IBMUSER  password=anything`.
   - [ ] **Results**: the seeded queue (`JOB00045`, `JOB00046`) renders; retrieve `JOB00045`'s output → spool output renders.
   - [ ] **Submit** ("LOAD" easy button): submit a job → it lands on the mock (`JOB00100`).
   - [ ] **Explorer**: `IBMUSER.SOURCE` / `IBMUSER.JCL` render as a tree; open member `HELLO` → its COBOL source loads into the editor.
   - [ ] **Disconnect** → status indicators clear.
