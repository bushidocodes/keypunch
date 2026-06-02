# Keypunch – codebase guide

## Project structure

| Path | Purpose |
|---|---|
| `src/main/` | Electron main process (Node context) |
| `src/preload/` | Preload script — bridges main ↔ renderer via IPC |
| `src/renderer/` | React renderer (Vite, TypeScript) |
| `harness/` | Vitest unit/integration tests + Playwright e2e tests |
| `resources/` | electron-builder asset directory (icons, images) |
| `out/` | electron-vite build output (git-ignored) |
| `release/` | electron-builder packaged installers (git-ignored) |

## Development

```bash
npm install        # install all deps (downloads Electron binary)
npm run dev        # hot-reload dev mode (electron-vite)
npm run build      # production build → out/
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint flat config
```

For faster lint/typecheck without downloading the Electron binary:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm install
```

## Testing

Tests live in `harness/`. Install harness deps separately:

```bash
cd harness && npm ci
npm test        # vitest unit + integration (mock FTP/JES)
npm run e2e     # Playwright _electron GUI tests (needs built app + xvfb on Linux)
```

Run e2e from repo root:

```bash
npm run build
cd harness && xvfb-run -a npm run e2e   # Linux
cd harness && npm run e2e               # macOS / Windows
```

## Release / packaging

Installers are produced by **electron-builder**. The build config lives under the `"build"` key in `package.json` (`appId: com.bushidocodes.keypunch`, `productName: Keypunch`). Artifacts land in `release/`.

### Per-platform scripts

| Script | Output |
|---|---|
| `npm run package-mac` | `release/*.dmg` (macOS) |
| `npm run package-win` | `release/*.exe` NSIS installer (Windows x64) |
| `npm run package-linux` | `release/*.AppImage` + `release/*.deb` (Linux x64) |
| `npm run package-all` | All three platforms in one pass |

> Each script runs `electron-vite build` first, so you don't need a separate `npm run build` step.

### Icons

| Platform | Source |
|---|---|
| macOS | `resources/icons/1024x1024.png` — electron-builder auto-converts to `.icns` |
| Windows | `resources/icon.ico` |
| Linux | `resources/icons/` directory (multiple sizes) |

### CI packaging workflow

`.github/workflows/package.yml` triggers on `v*` tags and `workflow_dispatch`. It runs three parallel jobs on native runners:

- **ubuntu-latest** → `npm run package-linux` → smoke-launches the AppImage under `xvfb-run`
- **windows-latest** → `npm run package-win` → validates the NSIS installer PE header
- **macos-latest** → `npm run package-mac` → mounts the DMG and verifies the app bundle

All artifacts are uploaded to the GitHub Actions run for download.

### Cutting a release

```bash
git tag v0.x.y
git push origin v0.x.y
```

This triggers the packaging workflow automatically. Monitor progress at:
`https://github.com/bushidocodes/keypunch/actions/workflows/package.yml`

## CI overview

`.github/workflows/ci.yml` runs on every push to `master` and every PR:

| Job | What it checks |
|---|---|
| `lint` | ESLint (skips Electron binary download) |
| `typecheck` | `tsc --noEmit` (skips Electron binary download) |
| `harness-tests` | Vitest unit + integration tests |
| `build` | electron-vite production build + artifact assertions |
| `e2e` | Playwright `_electron` GUI journey under xvfb |
