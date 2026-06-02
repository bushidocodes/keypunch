// Minimal automated *boot* smoke for the built app: launch the real Electron
// binary against the electron-vite build output (out/main/main.js, referenced
// by the root package.json `main`) and assert it starts and stays up — i.e. the
// main process, preload, and renderer bundle load without a fatal error — then
// terminate.
//
// Deeper GUI-journey coverage lives in the Playwright e2e (electronE2e.test.js),
// which drives the real UI against the mock JES server.
//
//   npm run smoke      # in harness/  (requires: `npm run build` done + a display)

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const electronExe = fileURLToPath(new URL('../node_modules/electron/dist/electron.exe', import.meta.url));
const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const builtMain = fileURLToPath(new URL('../out/main/main.js', import.meta.url));
const UPTIME_MS = Number(process.env.SMOKE_UPTIME_MS || 8000);

if (!existsSync(electronExe)) {
  console.error('FAIL: Electron binary not found at', electronExe, '\n  Run `npm install` at the repo root first.');
  process.exit(1);
}
if (!existsSync(builtMain)) {
  console.error('FAIL: out/main/main.js not found — run `npm run build` first.');
  process.exit(1);
}

console.log('Boot smoke: launching built app via', electronExe);
const child = spawn(electronExe, ['.'], {
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
    try { process.kill(-child.pid); } catch { child.kill('SIGKILL'); }
  }
  setTimeout(() => process.exit(0), 1500);
}, UPTIME_MS);
