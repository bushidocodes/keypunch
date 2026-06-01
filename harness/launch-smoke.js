// Minimal automated *boot* smoke for the built app: launch the real Electron
// binary against the built bundle and assert it starts and stays up (i.e. the
// main process and renderer bundle load without a fatal error), then terminate.
//
// This is intentionally shallow: Electron 1.8 predates Playwright's `_electron`
// driver, so full GUI journey automation lands in Phase 5 once Electron is
// modern. Until then, the deep coverage is the protocol-level FTP round-trip in
// integration/ftpRoundtrip.test.js, plus the manual checklist in SMOKE.md.
//
//   npm run smoke      # in harness/  (requires: Node-10 build done + a display)

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const electronExe = fileURLToPath(new URL('../node_modules/electron/dist/electron.exe', import.meta.url));
const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const builtMain = fileURLToPath(new URL('../app/main.js', import.meta.url));
const UPTIME_MS = Number(process.env.SMOKE_UPTIME_MS || 8000);

if (!existsSync(electronExe)) {
  console.error('FAIL: Electron binary not found at', electronExe, '\n  Run the Node-10 install first (see README).');
  process.exit(1);
}
if (!existsSync(builtMain)) {
  console.error('FAIL: app/main.js not found — run the build first (see README).');
  process.exit(1);
}

console.log('Boot smoke: launching built app via', electronExe);
const child = spawn(electronExe, ['./app/'], {
  cwd: repoRoot,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit'
});

let exited = false;
let terminating = false; // set once WE decide to kill it after a successful uptime
child.on('exit', (code) => {
  exited = true;
  if (terminating) return; // the kill we initiated — not an early exit
  if (code && code !== 0) {
    console.error(`FAIL: app exited early with code ${code}`);
    process.exit(1);
  }
});
child.on('error', (err) => {
  console.error('FAIL: could not launch Electron:', err.message);
  process.exit(1);
});

setTimeout(() => {
  if (exited) return; // exit handler already decided
  terminating = true;
  console.log(`PASS: app stayed up for ${UPTIME_MS}ms (booted without a fatal error). Terminating.`);
  if (process.platform === 'win32') {
    spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']);
  } else {
    try { process.kill(-child.pid); } catch (_) { child.kill('SIGKILL'); }
  }
  setTimeout(() => process.exit(0), 1500);
}, UPTIME_MS);
