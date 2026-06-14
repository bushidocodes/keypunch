import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const appDir = resolve(__dirname, 'app');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main.ts')
      },
      rollupOptions: {
        output: {
          // Force CJS format and .cjs extension so Node/Electron treats it as
          // CJS even though the root package.json declares "type": "module".
          format: 'cjs',
          entryFileNames: 'main.cjs'
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts')
      },
      rollupOptions: {
        output: {
          // Preload must be CommonJS (sandbox-friendly) — force CJS format and
          // use .cjs extension so Node/Electron treats it as CJS even though the
          // root package.json declares "type": "module".
          format: 'cjs',
          entryFileNames: 'preload.cjs'
        }
      }
    }
  },
  renderer: {
    root: appDir,
    plugins: [
      react({
        include: /\.(jsx?|tsx?)$/
      })
    ],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'app/index.html')
      }
    }
  }
});
