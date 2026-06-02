import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { transform } from 'esbuild';

const appDir = resolve(__dirname, 'app');

// JSX lives inside plain `.js` files and the app is on React 15 (classic
// runtime). We transform every `.js`/`.jsx` file under `app/` through esbuild's
// JSX loader, emitting `React.createElement` calls. A dedicated plugin (rather
// than Vite's top-level `esbuild.include`) makes this robust to Windows path
// separators and guarantees the transform runs before Rollup parses the entry.
//
// We deliberately do NOT use @vitejs/plugin-react: its Fast Refresh requires
// React >= 16.9 and would break on React 15.
function reactClassicJsx() {
  const normalize = (id) => id.split('?')[0].replace(/\\/g, '/');
  const appDirPosix = appDir.replace(/\\/g, '/');
  return {
    name: 'keypunch:react15-classic-jsx',
    enforce: 'pre',
    async transform(code, id) {
      const file = normalize(id);
      if (!file.startsWith(appDirPosix)) return null;
      if (!/\.jsx?$/.test(file)) return null;
      const result = await transform(code, {
        loader: 'jsx',
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment',
        sourcemap: true,
        sourcefile: id
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
    plugins: [reactClassicJsx()],
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'app/index.html')
      }
    },
    // Disable Vite's own esbuild JSX handling so it doesn't double-process /
    // conflict with our plugin.
    esbuild: false,
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
        jsx: 'transform',
        jsxFactory: 'React.createElement',
        jsxFragment: 'React.Fragment'
      }
    }
  }
});
