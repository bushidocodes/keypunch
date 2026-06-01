# Keypunch — Gradual Modernization Plan

Goal: make Keypunch **simpler to build and run** — ideally `npm install && npm run dev`
on a current Node LTS, no version-manager gymnastics, one config file, one lockfile, a
supported Electron, and a test/CI setup that isn't abandonware.

This is written to be executed **incrementally**. Every phase ends with a working,
buildable app. You can stop after any phase and still be better off than today.

---

## Guiding principles

1. **Each phase is independently shippable and ends green** (`build` + launch both work).
   No phase depends on a later phase to compile.
2. **Separate "build" modernization from "runtime" modernization.** They are different
   risk profiles and people conflate them:
   - *Build* (toolchain: webpack/babel/node) — high ROI, low behavioral risk. Do first.
   - *Runtime* (Electron major upgrade, security model, `remote` removal) — behavioral
     + security risk because the renderer currently runs Node directly. Do after the
     build is sane.
3. **Leapfrog, don't crawl, through the build tool.** Upgrading webpack 1 → 2 → 3 → 4 → 5
   is four sets of breaking changes (loader syntax, plugin API, hashing) for an end
   state that's *still* more config than a modern tool. Because the app is only ~2,700
   LOC of fairly standard React, replacing the toolchain wholesale is **less** total
   work than the stepwise upgrade — and it's still "gradual" because the old build keeps
   working on a branch until the new one is green.
4. **Keep the old build runnable until the new one passes the smoke test**, then delete
   the old one in the same PR.

---

## Current state (the snapshot we're modernizing away from)

| Area | Today | Pain |
|------|-------|------|
| Build tool | **webpack 1.14** + `webpack-validator` + 6 config files (`base`, `development`, `production`, `electron`, `eslint`, `test`) | webpack 1 is EOL; breaks on Node 17+ (OpenSSL 3 `digital envelope routines::unsupported`). |
| Transpile | **Babel 6** (`preset-env` targeting node 6, `stage-0`, `react`, `react-hmre`, `tcomb`, `babili` minifier) | Babel 6 toolchain won't run on Node 24 at all. |
| Node | Pinned to **10.24.1** via `.node-version` | Forces `fnm`/`nvm`; can't use the machine's Node (24). |
| Types | **Flow** (`flow-bin`, `flow-typed/` ~60 stub files) on a handful of files | Niche; `flow-typed/` is dead weight. |
| Electron | **^1.4.15 → resolves to 1.8.8** | ~6 years of security fixes missing; uses removed APIs. |
| Renderer security | `nodeIntegration` on, `electron.remote` used in **5 files**, raw `fs` + `promise-ftp` in the renderer | The old insecure model; blocks any modern Electron. |
| Dev workflow | Custom `server.js` (express + `webpack-hot-middleware`) + **two terminals** (`hot-server` + `start-hot`) | Lots of moving parts for HMR. |
| Manifests | **Two** `package.json` (root + `app/`) | ERB-era "externals" trick; confusing. |
| Lockfiles | **Three**: `package-lock.json` (739 KB), `yarn.lock` (269 KB), `app/yarn.lock` (86 B) | Ambiguous which is source of truth. |
| UI lib | `react-desktop@0.2.14` | Abandoned (~2018); peer-pins old React → blocks React 16/17/18. |
| Tests | `mocha` + `chai` + `enzyme` (React-15-bound) + `spectron` (deprecated 2022) + `jsdom` | All abandonware; test dirs are mostly `.gitkeep` stubs, so little to lose. |
| CI | `.travis.yml` + `appveyor.yml` (Node 6/7) | Dead CI providers/versions. |
| App code | React 15.4, Redux 3.6, react-router 3, redux-thunk, react-ace/brace, redux-logger | Old but functional; the FTP/JES logic in `app/utils/jesFtp.js` is the real value. |

**The reassuring part:** the application itself is small and the domain logic
(`app/utils/jesFtp.js`, `nativeDialogs.js`, the reducers/actions) is decoupled from the
build tool. Almost all the pain is in the scaffolding, not the app.

---

## Target end-state

- `npm install && npm run dev` on current **Node LTS** (no `.node-version` pin needed).
- **electron-vite** for build/HMR (single `electron.vite.config.ts`), **electron-builder**
  retained for packaging (already configured).
- **One** `package.json`, **one** lockfile (npm).
- Supported **Electron LTS**, `contextIsolation: true`, `nodeIntegration: false`, a
  **preload** bridge; FTP/`fs` run in the **main** process behind IPC.
- **vitest** + React Testing Library (unit) and **Playwright** (Electron e2e).
- **GitHub Actions** CI replacing Travis/AppVeyor.
- TypeScript optional and adopted file-by-file (not a prerequisite).

---

## Phases

### Phase 0 — Baseline, guardrails & verification harness (no behavior change) · risk: none · effort: M

Lock down a known-good starting point **and build the test harness every later phase will
reuse**. This harness is the safety net for the whole migration.

- [ ] Confirm the documented Node-10 build works end to end and capture the result
      (a screenshot of the running app + the `dist/` artifact list) as the "golden" baseline.
- [ ] **Pick one package manager.** The README and `package-lock.json` already imply npm.
      Delete `yarn.lock` and the near-empty `app/yarn.lock`; keep `package-lock.json`.
- [ ] Add a one-paragraph "How the build works today" note (or rely on this doc) so the
      next phase has context.
- [ ] **Build the verification harness** (see *Testing & Verification Protocol* below):
  - A **mock FTP/JES server** — a local stub implementing exactly the commands
    `app/utils/jesFtp.js` uses (login, `SITE FILETYPE=JES|SEQ`, `ASCII`, `LIST`, `PUT`,
    `GET`, `DELETE`, `CWD`, `PWD`) — seeded with a fixed fixture (known jobs +
    datasets/members) and a **one-command reseed** that resets it to that baseline.
  - A handful of **automated unit tests** for the pure parsing logic in `jesFtp.js`
    (LIST output → jobs/datasets/members) and the reducers — no server needed; these lock
    in current behavior so refactors can't silently change it.
  - A thin **automated e2e smoke test** (Playwright `_electron`) that launches the *built*
    app against the mock server and walks the core user path.
- [ ] (Optional) Add a throwaway GitHub Actions job that runs the *current* Node-10 build +
      harness, so any regression during migration is caught automatically.

**Exit criteria:** clean `git status`, single lockfile, build still green on Node 10, and
the harness (reseed → `npm test` → e2e smoke) passes against the **current** app — every
later phase now has a green baseline to diff against.

---

### Phase 1 — Replace the build toolchain (the big "build" win) · risk: med · effort: L

Swap webpack 1 / Babel 6 / babili / custom HMR server for **electron-vite**. This is the
phase that removes the Node-10 pin and the OpenSSL breakage. Do it on a branch with the
old build still intact until the new one launches.

- [ ] Add `electron-vite` + `vite` + `@vitejs/plugin-react`. Create one
      `electron.vite.config.(js|ts)` with three sections: `main`, `preload`, `renderer`.
- [ ] Point `main` at `app/main.development.js`, `renderer` at `app/index.js` /
      `app/app.html`. Vite handles CSS, CSS-modules, fonts, SVG, and images natively —
      this deletes the entire loaders block (`css-loader`, `style-loader`, `file-loader`,
      `url-loader`, `extract-text-webpack-plugin`, `json-loader`, `html-webpack-plugin`).
- [ ] Replace Babel with Vite's built-in esbuild/SWC transform. **Strip Flow** (`// @flow`
      annotations appear in only a few files) — or keep Flow off the hot path; either way
      drop `flow-bin`, `flow-typed/`, `babel-plugin-tcomb`, `tcomb`.
- [ ] Delete the custom HMR stack: `server.js`, `webpack-hot-middleware`,
      `webpack-dev-middleware`, `express`, `webpack-validator`, `webpack-merge`, all
      `webpack.config.*.js`, `babili-webpack-plugin`, and the whole Babel 6 dep cluster.
- [ ] New scripts: `dev` (electron-vite dev, **one** command, HMR for main+renderer),
      `build` (electron-vite build), `start` (preview). Remove `hot-server`, `start-hot`,
      `build-main`, `build-renderer`, the `concurrently` postinstall, and `cross-env`
      (Vite reads `.env`/mode natively).
- [ ] Remove the Node pin: delete/relax `.node-version`, drop `devEngines` and the
      `fbjs-scripts` engine check.

**Watch out for:** `app/app.html` hand-writes `<script>`/`<link>` tags based on
`process.env.HOT` — electron-vite injects these, so simplify `app.html` to a normal Vite
`index.html` with a single `<script type="module" src="./index.js">`.

**Exit criteria:** `npm install && npm run dev` launches with HMR on current Node;
`npm run build && npm start` produces a working app. Old webpack files deleted in the
same PR.

---

### Phase 2 — Collapse manifests & dependency hygiene · risk: low · effort: S

Now that webpack `externals` (the reason for two `package.json`) is gone, simplify.

- [ ] Merge `app/package.json` runtime deps into the root `package.json`; delete
      `app/package.json`. Update `electron-builder` `files`/`directories` accordingly.
- [ ] Remove dead tooling: `boiler-room-custodian` + the `cleanup`/`mop` script,
      `devtron` (deprecated), `electron-debug` (optional), `add-module-exports`,
      `eslint-import-resolver-webpack`, `eslint-plugin-compat`, `eslint-plugin-flowtype*`,
      `browserslist: electron 1.4`.
- [ ] Fix the boilerplate `appId` (`org.develar.ElectronReact`) and product metadata so
      packaged builds are branded as Keypunch. Consolidate the duplicated icon sets under
      `resources/` (`resources/New folder/`, `*.old` files, two parallel icon dirs).

**Exit criteria:** one `package.json`, one lockfile, `npm run build` + package still green.

---

### Phase 3 — Electron runtime upgrade (the big "run" win) · risk: high · effort: L

Move off Electron 1.8 to a supported LTS. Split into two sub-steps so you're never far
from a working app.

**3a — Get onto modern Electron with minimal code change (`@electron/remote` shim).**
- [ ] Bump `electron` to current LTS. The blocker is that the renderer uses
      `require('electron').remote` in **5 files** — `app/index.js`, `app/components/StatusBar.js`,
      `app/components/Results.js`, `app/utils/nativeDialogs.js`, `app/utils/menu.js` — and
      `remote` was removed from Electron core in v14.
- [ ] Install the standalone `@electron/remote`, initialize it in main, and replace
      `require('electron').remote` → `require('@electron/remote')`. Keep `nodeIntegration`
      on for now. This is a mechanical change that gets the app running on modern Electron.
- [ ] Sanity-check removed/renamed main-process APIs in `app/main.development.js`
      (menu `selector:` roles, `openDevTools`, window options).

**Exit criteria for 3a:** app launches and is fully usable on current Electron LTS.

**3b — Adopt the secure model (`contextIsolation` + preload + IPC).**
- [ ] Add a `preload.js` exposing a typed, minimal API via `contextBridge`
      (`openFile`, `saveFile`, `submitJob`, `pollJobs`, `listDatasets`, …).
- [ ] Move the Node-dependent code out of the renderer into **main**: `fs` usage in
      `app/utils/nativeDialogs.js` and **all** of `app/utils/jesFtp.js` (`promise-ftp`,
      `bluebird`). Today these run in the renderer and dispatch straight into the Redux
      store; invert that — main does I/O, sends results over IPC, the renderer dispatches.
- [ ] Set `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`; drop
      `@electron/remote`.
- [ ] Move native menu construction (`app/utils/menu.js`) fully into main; the renderer
      requests actions over IPC instead of building menus via `remote`.

**Watch out for:** `jesFtp.js` imports `{ store } from '../index'` (a renderer circular
dependency) — moving FTP to main forces a cleaner boundary, which is a feature, not a bug.

**Exit criteria for 3b:** app works with `nodeIntegration: false` and `contextIsolation:
true`; no `remote`; FTP/file I/O confirmed working against a z/OS FTP endpoint (or a
mocked one).

---

### Phase 4 — App-library refresh (optional, unblocks React 18) · risk: med · effort: M–L

Not required to build/run, but this is the gate for the modern React ecosystem.

- [ ] **`react-desktop@0.2.14` is the long pole** — abandoned and pins old React. Decide:
      keep the Win10 chrome on React 15, or replace `Window/View/NavPane` with a
      maintained lib (or plain fl/CSS) to unlock React 16/17/**18**.
- [ ] Once unblocked: React 15 → 18 (new `createRoot` API), `react-router` 3 → 6
      (route config in `routes.js` changes shape), Redux 3 → **Redux Toolkit** (the
      hand-rolled `configureStore.*` files collapse into `configureStore` from RTK),
      update `react-ace`/`brace`, replace `font-awesome` with a maintained icon set.

**Exit criteria:** app runs on React 18 with maintained dependencies.

---

### Phase 5 — Tests, lint, and CI · risk: low · effort: M

Builds on the Phase 0 harness: this phase **hardens and expands** it (full coverage,
replaces the legacy runner, wires CI). The current test setup is abandonware **and nearly
empty** (the `test/` subdirs are `.gitkeep` stubs; only `example.js`/`e2e.js` skeletons
exist), so there's little to lose.

- [ ] Formalize the Phase 0 harness: standardize on **vitest** + React Testing Library for
      unit/component tests and **Playwright** (`_electron`) for e2e; delete the legacy
      `mocha`+`chai`+`enzyme`+`jsdom`+`spectron` config and `test/setup.js`.
- [ ] Add real coverage for the high-value, parser-style logic in `jesFtp.js`
      (the `list`/dataset/member string parsing is pure and very testable).
- [ ] Replace eslint 3 + `eslint-config-airbnb` + Flow plugins with a modern eslint flat
      config (or **Biome** for one-tool lint+format). Drop `eslint-formatter-pretty`.
- [ ] Add a **GitHub Actions** workflow (lint + build + test on current Node, matrix on
      win/mac/linux for packaging). Delete `.travis.yml` and `appveyor.yml`.

**Exit criteria:** `npm test` and `npm run lint` pass in CI on current Node.

---

### Phase 6 — TypeScript (optional, ongoing) · risk: low · effort: M, incremental

- [ ] Enable TS in the Vite config with `allowJs`; rename files to `.ts/.tsx` opportunistically,
      starting with the IPC contract/preload API and `jesFtp.js` parsing. No big-bang.

---

## Dependency disposition (quick reference)

| Keep | Replace | Drop |
|------|---------|------|
| `react`, `react-dom`, `redux`, `react-redux`, `redux-thunk`, `react-ace`, `brace`, `react-treebeard`, `promise-ftp`, `electron`, `electron-builder` | webpack stack → **electron-vite/vite**; Babel 6 → esbuild/SWC; mocha/chai/enzyme → **vitest+RTL**; spectron → **Playwright**; redux store → **Redux Toolkit** (Phase 4); `react-desktop` → maintained UI (Phase 4); travis/appveyor → **GH Actions** | `webpack-validator`, `webpack-merge`, `webpack-hot-middleware`, `webpack-dev-middleware`, `express`, `babili-webpack-plugin`, all `babel-*`, `tcomb`, `flow-bin`, `flow-typed/`, `boiler-room-custodian`, `devtron`, `fbjs-scripts`, `concurrently`, `cross-env`, `eslint-plugin-compat`, `eslint-import-resolver-webpack`, `bluebird` (use native Promises), the second `package.json`, two of three lockfiles |

---

## Known bugs to fix opportunistically (not build/run blockers)

- `app/utils/jesFtp.js` `_pollMostRecentJobUntilComplete()` references undefined
  identifiers (`jobIDs`, `mostRecentJobID`, a bare `sleep`) and calls `jobs(...)` as a
  function when `jobs` is an object — this method would throw if ever invoked. Good
  candidate to fix while moving FTP into main (Phase 3b) and adding tests (Phase 5).
- `disconnect()` doesn't `await`/return its `this.ftp.end()` promise before polling status.

---

## Testing & Verification Protocol

> **Keypunch has no database.** Its only backing/external state is the z/OS mainframe it
> talks to over FTP (the JES job queue + datasets, via `app/utils/jesFtp.js`). Wherever a
> generic plan says "reseed the DB," for Keypunch that means **reset the mock FTP/JES
> server to its baseline fixture.** The mock server (built in Phase 0) lets these tests run
> deterministically in CI with no live mainframe or credentials.

**This protocol runs as the Definition of Done for every phase.** A phase is not "done"
until it passes against a *clean, freshly rebuilt* app on the target Node version.

1. **Clean rebuild from scratch** (never trust incremental artifacts):
   ```
   rm -rf node_modules app/node_modules dist app/dist release \
          app/main.js app/main.js.map app/bundle.js app/style.css
   npm ci            # deterministic install from the single lockfile
   npm run build     # produce the real, shippable artifacts
   ```
2. **Reseed the backing state to a known baseline:** reset the **mock FTP/JES server** to
   its fixture — a fixed set of JES jobs (e.g., one `OUTPUT`, one `ACTIVE`) and a fixed set
   of datasets + members with known attributes. Reseed **before each e2e run** so tests are
   independent and repeatable.
3. **Automated unit tests must pass** (`npm test`): the pure `jesFtp.js` parsing (LIST →
   jobs/datasets/members), reducers, and action creators. Deterministic; no server needed.
4. **Automated e2e smoke test must pass** against the **built** app pointed at the reseeded
   mock server (Playwright `_electron`). The core user journey:
   1. App launches; main window visible; **no uncaught console/main-process errors**.
   2. **Editor**: type JCL/source; content persists across pane switches.
   3. **Config**: enter mock host/port/user/pass; connect → "connected" indicator lights.
   4. **Submit** ("easy button"): submit a job → it appears in Results.
   5. **Results** (`onEnter={pollJobStatus}`): the seeded JES queue renders; retrieve a
      job's output → output renders in the viewer.
   6. **Explorer** (`onEnter={listDatasets}`): seeded datasets + members render as a tree;
      open a member → its content loads into the editor.
   7. **Disconnect** → all status indicators clear.
5. **Record evidence in the phase issue:** paste the real `npm test` output and the e2e run
   log/screenshot. (Per repo convention: *verify by execution, not by eyeballing.*)
6. **Phase-specific gates** (in addition to the above):
   - *Phase 1:* `npm run dev` + `build` succeed on **current Node LTS** with **no**
     `NODE_OPTIONS=--openssl-legacy-provider` workaround.
   - *Phase 3a:* app launches on the new Electron with **zero** references to the removed
     core `remote` module remaining.
   - *Phase 3b:* assert at runtime that `contextIsolation === true` and
     `nodeIntegration === false`, and that the renderer has **no** direct `fs`/`promise-ftp`
     access; all FTP goes over IPC.
   - *Phase 4:* the e2e smoke path passes on the upgraded React/router/UI stack.

## Suggested sequencing

```
Phase 0 ─► Phase 1 ─► Phase 2 ─► Phase 3a ─► Phase 3b ─► Phase 5
                          └► (Phase 4 ─► enables React 18) ┘
                                            Phase 6 runs continuously
```

Phases 0–2 alone deliver "simple to build" (current Node, one command, one config, one
lockfile). Phase 3 delivers "safe to run." Phases 4–6 are quality/longevity.
