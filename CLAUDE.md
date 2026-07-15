# Keypunch – codebase guide

## Project structure

| Path | Purpose |
|---|---|
| `electron/` | Electron main process + preload script (Node context) |
| `app/` | React renderer (Vite, TypeScript) |
| `harness/` | Vitest unit/integration tests + Playwright e2e tests (TypeScript; own `tsconfig.json`) |
| `resources/` | electron-builder asset directory (icons, images) |
| `out/` | electron-vite build output (git-ignored) |
| `release/` | electron-builder packaged installers (git-ignored) |

## Development

```bash
pnpm install       # install all deps (downloads Electron binary)
pnpm dev           # hot-reload dev mode (electron-vite)
pnpm build         # production build → out/
pnpm typecheck     # tsc --noEmit
pnpm lint          # Biome check
```

For faster lint/typecheck without downloading the Electron binary:

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install
```

## Testing

Tests live in `harness/`. The harness is a pnpm workspace package, so root `pnpm install` installs its deps automatically — no separate install step needed:

```bash
cd harness
pnpm typecheck     # tsc --noEmit over the harness (+ the app modules it imports)
pnpm test          # vitest unit + integration (mock FTP/JES)
pnpm e2e           # Playwright _electron GUI tests (needs built app + xvfb on Linux)
```

The whole harness is TypeScript. It has its own `harness/tsconfig.json` (extends the
root config, adds vitest globals); `pnpm typecheck` there also transitively
type-checks the `app/` modules the tests import, so an IPC-contract or reducer-shape
change that breaks a test surfaces as a type error.

Run e2e from repo root:

```bash
pnpm build
cd harness && xvfb-run -a pnpm e2e     # Linux
cd harness && pnpm e2e                  # macOS / Windows
```

## Release / packaging

Installers are produced by **electron-builder**. The build config lives under the `"build"` key in `package.json` (`appId: com.bushidocodes.keypunch`, `productName: Keypunch`). Artifacts land in `release/`.

### Per-platform scripts

| Script | Output |
|---|---|
| `pnpm package-mac` | `release/*.dmg` (macOS) |
| `pnpm package-win` | `release/*.exe` NSIS installer (Windows x64) |
| `pnpm package-linux` | `release/*.AppImage` + `release/*.deb` (Linux x64) |
| `pnpm package-all` | All three platforms in one pass |

> Each script runs `electron-vite build` first, so you don't need a separate `npm run build` step.

### Icons

| Platform | Source |
|---|---|
| macOS | `resources/icons/1024x1024.png` — electron-builder auto-converts to `.icns` |
| Windows | `resources/icon.ico` |
| Linux | `resources/icons/` directory (multiple sizes) |

### CI packaging workflow

`.github/workflows/package.yml` triggers on `v*` tags and `workflow_dispatch`. It runs three parallel jobs on native runners:

- **ubuntu-latest** → `pnpm package-linux` → smoke-launches the AppImage under `xvfb-run`
- **windows-latest** → `pnpm package-win` → validates the NSIS installer PE header
- **macos-latest** → `pnpm package-mac` → mounts the DMG and verifies the app bundle

All artifacts are uploaded to the GitHub Actions run for download.

### Cutting a release

```bash
git tag v0.x.y
git push origin v0.x.y
```

This triggers the packaging workflow automatically. Monitor progress at:
`https://github.com/bushidocodes/keypunch/actions/workflows/package.yml`

## Dependency notes

### `electron-vite` beta pin

`electron-vite` is pinned to `^6.0.0-beta.1` (pre-release) rather than the
`latest` dist-tag (`5.0.0`). This is intentional:

- The project uses **Vite 8** (`vite ^8.0.16`).
- `electron-vite@5` only supports `vite ^5 || ^6 || ^7` — Vite 8 is not in its
  peer-dependency range and `npm install` will refuse the combination.
- `electron-vite@6.0.0-beta.1` extended the peer range to `^6 || ^7 || ^8`.

Until an `electron-vite` v6 stable release ships, the beta is the only
published version that supports Vite 8. Watch
[`electron-vite` releases](https://github.com/alex8088/electron-vite/releases)
and upgrade when a stable v6 appears.

## CI overview

`.github/workflows/ci.yml` runs on every push to `master` and every PR:

| Job | What it checks |
|---|---|
| `lint` | Biome (skips Electron binary download) |
| `typecheck` | `tsc --noEmit` over app/ + electron/ (skips Electron binary download) |
| `harness-tests` | Harness `tsc --noEmit` typecheck + Vitest unit + integration tests |
| `build` | electron-vite production build + artifact assertions |
| `e2e` | Playwright `_electron` GUI journey under xvfb |
