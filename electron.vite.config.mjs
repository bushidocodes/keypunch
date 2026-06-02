import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const appDir = resolve(__dirname, 'app');

// The renderer is React 18 with JSX living inside plain `.js` files.
//
// @vitejs/plugin-react gives us React Fast Refresh in dev (its Babel pass also
// matches `.js` because its default include is /\.[tj]sx?$/). The actual JSX ->
// React.jsx() transform, however, is performed by Vite's esbuild, which only
// treats `.jsx`/`.tsx` as JSX by default. So we tell esbuild to load the app's
// `.js` files with the `jsx` loader. esbuild's `include`/`exclude` here is
// independent of plugin-react's Fast-Refresh `include`.
const esbuildJsxForJs = {
  loader: 'jsx',
  include: /app[\\/].*\.js$/,
  exclude: []
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main.js')
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
        entry: resolve(__dirname, 'electron/preload.js')
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
    esbuild: esbuildJsxForJs,
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' }
      }
    },
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'app/index.html')
      }
    }
  }
});
