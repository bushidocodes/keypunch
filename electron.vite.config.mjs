import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { transform } from 'esbuild';

const appDir = resolve(__dirname, 'app');

// The renderer is React 18 with JSX living inside plain `.js` files, mixed (as
// of Phase 6) with a few `.ts` modules.
//
// @vitejs/plugin-react gives us React Fast Refresh in dev (its Babel pass also
// matches `.js`/`.ts` because its default include is /\.[tj]sx?$/). The actual
// JSX -> React.jsx() transform, and TS type-stripping, is done by esbuild.
//
// Vite's BUILT-IN esbuild pass already handles `.ts`/`.tsx`/`.jsx` (it strips
// types and transforms JSX). What it does NOT do by default is treat JSX inside
// plain `.js` files as JSX. So we add a tiny plugin that runs esbuild's `jsx`
// loader over ONLY `app/**/*.js`, and leave Vite's default esbuild to handle
// the `.ts` files. (We deliberately do NOT override Vite's `esbuild` option,
// which would replace its default include and drop `.ts` handling.)
function jsxInJsPlugin() {
  const isAppJs = (id) => /app[\\/].*\.js$/.test(id) && !id.includes('node_modules');
  return {
    name: 'keypunch:jsx-in-js',
    enforce: 'pre',
    async transform(code, id) {
      if (!isAppJs(id)) return null;
      const result = await transform(code, {
        loader: 'jsx',
        jsx: 'automatic',
        sourcefile: id,
        sourcemap: true
      });
      return { code: result.code, map: result.map };
    }
  };
}

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
      jsxInJsPlugin(),
      react({
        include: /\.(jsx?|tsx?)$/
      })
    ],
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
