// Playwright globalSetup — runs before any test file is loaded.
//
// Ensures the Electron binary is present so the top-level
// `createRequire('electron')` in electronE2e.test.ts doesn't throw when
// `pnpm install` was done with ELECTRON_SKIP_BINARY_DOWNLOAD=1 (the documented
// fast path for lint/typecheck).  If path.txt is absent the binary was never
// downloaded; fetch it now via a plain `pnpm install` in the repo root.
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
const pathTxt = resolve(repoRoot, 'node_modules', 'electron', 'path.txt');

export default async function globalSetup(): Promise<void> {
  if (!existsSync(pathTxt)) {
    console.warn('\n[e2e] Electron binary absent — downloading now (ELECTRON_SKIP_BINARY_DOWNLOAD was set during install)…');
    execSync('pnpm install', { cwd: repoRoot, stdio: 'inherit' });
    console.log('[e2e] Electron binary ready.\n');
  }
}
