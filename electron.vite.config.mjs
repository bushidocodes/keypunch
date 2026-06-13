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
          entryFileNames: 'main.js'
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
          // Preload must be CommonJS (sandbox-friendly) — keep the .js name.
          entryFileNames: 'preload.js'
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
