import react from '@vitejs/plugin-react';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { resolve } from 'path';

// `__dirname` is injected by Vite's config loader (esbuild bundles this file to
// CJS and defines __dirname/__filename), so it is available even though the root
// package.json declares "type": "module".
const appDir = resolve(__dirname, 'app');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main.ts'),
      },
      rollupOptions: {
        output: {
          // Force CJS format and .cjs extension so Node/Electron treats it as
          // CJS even though the root package.json declares "type": "module".
          format: 'cjs',
          entryFileNames: 'main.cjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts'),
      },
      rollupOptions: {
        output: {
          // Preload must be CommonJS (sandbox-friendly) — force CJS format and
          // use .cjs extension so Node/Electron treats it as CJS even though the
          // root package.json declares "type": "module".
          format: 'cjs',
          entryFileNames: 'preload.cjs',
        },
      },
    },
  },
  renderer: {
    root: appDir,
    plugins: [
      react({
        include: /\.(jsx?|tsx?)$/,
      }),
    ],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'app/index.html'),
      },
    },
  },
});
