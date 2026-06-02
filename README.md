# Keypunch
[![Code Climate](https://codeclimate.com/github/spmcbride1201/keypunch-electron/badges/gpa.svg)](https://codeclimate.com/github/spmcbride1201/keypunch-electron) ![David-DM Dependency Badge](https://david-dm.org/spmcbride1201/keypunch-electron.svg)
<p align="center">
<img  src='./resources/images/Keypunch Icon.png'/>
</p>
Keypunch is a lightweight text editor designed to accelerate the ease of learning core IBM Mainframe languages like COBOL, PL/I, or z/Architecture Assembler by providing a dynamic hot reloading experience similar to Code School or Codecademy. Aspiring mainframe software engineers develop in an Ace 9 powered code editor, and by clicking a single easy button, Keypunch uses the `mainframe job` package to submit, retrieve, and render the output of their code alongside the code editor. By shortening the feedback loop, Keypunch hopes to accelerate the learning process of junior mainframe developers.

Because all client and Node.js logic is encapsulated in a single Electron app, Keypunch can run on corporate laptops behind the firewall. Because it uses `mainframe-job` to abstract away the details of interfacing with the mainframe's Job Entry Subsystem, Keypunch supports the long-tail of back-leveled z/OS systems. The goal is to help your developers learn to develop without a SysGen or other major impacts to your core business apps.

While this is a work in progress focused on delivering an initial MVP, this app offers a foundational platform that may be eventually enhanced to provide features such as:
* lessons for PL/1, COBOL, REXX, FORTRAN, HLASM, etc. that run entirely on the client app by parsing the JES output.
* enhancement to support z/VSE
* Use of socket.io to provide remote pair-programming for two corporate employees over the intranet.
* Gamification and Badges to encourage learning without compromising core business data.

## Screenshot
TODO

## Toolchain (modernized — Phase 1)

Keypunch builds with **electron-vite** (Vite 7) on a current Node LTS, runs on **Electron 42**,
and uses the secure renderer model: `contextIsolation: true`, `nodeIntegration: false`, and a
**preload** bridge (`window.keypunch`). All Node-side work — filesystem dialogs and the z/OS
FTP/JES traffic (`promise-ftp`) — runs in the **main** process behind IPC; the renderer only
parses results. No `.node-version` pin, no `--openssl-legacy-provider`, one `package.json`,
one lockfile.

## Install & run

Requires a current Node LTS (developed/verified on Node 24).

```bash
npm install        # installs deps + downloads the Electron binary
npm run dev        # electron-vite dev server (Vite renderer + main/preload), launches the app
```

To build and run the production bundle:

```bash
npm run build      # electron-vite -> out/{main,preload,renderer}
npm start          # electron-vite preview of the built app
```

Notes:
* The app renders fully offline; **SUBMIT/LOAD require a z/OS FTP endpoint** configured in the
  Config pane. The [verification harness](harness/) ships a mock z/OS FTP/JES server for testing
  (`cd harness && npm run mock`).
* React stays at **15** for now (react-desktop pins it); the React/router/Redux refresh is
  Phase 4. See [MODERNIZATION.md](MODERNIZATION.md).

## Running / troubleshooting

**Always launch via the npm scripts (`npm run dev` or `npm start`) — don't run the `electron`
binary directly.** electron-vite compiles the main/preload/renderer bundles and wires up the
app paths for you. The build output (`out/`) is gitignored, so a bare `electron .` has no
`main` to load and will fail.

Common errors from invoking Electron by hand:

| Dialog | Cause | Fix |
|--------|-------|-----|
| `Unable to find Electron app at …` / `Cannot find module '<repo path>'` | `electron .` with no build present (`out/main/main.js` missing) | Use `npm run dev`, or `npm start` (which builds, then previews) |
| `Cannot find module '…console.log(process.versions.chrome)'` (or any expression) | Electron has **no** `-e`/`--eval` flag like Node, so the string is treated as the app path | Don't eval through Electron — see *Checking versions* below |

**Checking versions**
* Electron: `npx electron --version` → `v42.x` (Electron 42 ships Chromium ~136 / Node ~22).
* Chromium, from the running app: **View → Toggle Developer Tools**, then run
  `navigator.userAgent` in the console (shows `Chrome/136…`).
* `process` is intentionally **absent from the renderer** — that's `contextIsolation` (the
  secure model) working as designed. Renderer code reaches Node/main only through the
  `window.keypunch` preload bridge, never `process` or `require`.

## Packaging

To package apps for the local platform:

```bash
$ npm run package
```

To package apps for all platforms:

First, refer to [Multi Platform Build](https://github.com/electron-userland/electron-builder/wiki/Multi-Platform-Build) for dependencies.

Then,
```bash
$ npm run package-all
```

To package apps with options:

```bash
$ npm run package -- --[option]
```

## Tests

The [verification harness](harness/) (separate workspace, runs on modern Node) holds the
unit/integration tests and the Playwright GUI e2e:

```bash
cd harness && npm install
npm test           # vitest: jesParse + reducer unit tests, mock FTP/JES round-trip
npm run e2e        # Playwright _electron GUI journey against the built app + mock server
```

## Build with love using
* [React Desktop](https://github.com/gabrielbull/react-desktop)
* [Electron React Boilerplate](https://github.com/chentsulin/electron-react-boilerplate) 
* [Electron](http://electron.atom.io/) 
* [React](https://facebook.github.io/react/)
* [Redux](https://github.com/reactjs/redux)
* [React Router](https://github.com/reactjs/react-router)
* [Webpack](http://webpack.github.io/docs/)
* [React Transform HMR](https://github.com/gaearon/react-transform-hmr)
* [Devtron](https://github.com/electron/devtron)
* [electron-debug](https://github.com/sindresorhus/electron-debug)
* [React Developer Tools](https://github.com/facebook/react-devtools) 
* [electron-devtools-installer](https://github.com/GPMDP/electron-devtools-installer)
* [Redux DevTools](https://github.com/zalmoxisus/redux-devtools-extension)

## Useful Resources
* http://www.ibm.com/support/knowledgecenter/SSLTBW_2.1.0/com.ibm.zos.v2r1.halu001/intfjesexample.htm
* http://www2.latech.edu/~acm/helloworld/mvsjcl.html

## License
MIT © [Sean McBride](https://github.com/spmcbride1201)
