import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // Use vite's built-in esbuild JSX transform instead of @vitejs/plugin-react.
  // This avoids a dependency on Babel (and the Babel packages that live in the
  // project root's node_modules rather than the harness's), is faster in the
  // test runner, and is functionally equivalent for our test setup since we
  // don't need React Fast Refresh here.
  esbuild: {
    jsx: 'automatic', // emit `import { jsx } from 'react/jsx-runtime'` instead of React.createElement
  },

  test: {
    // Default environment for unit / integration tests (unchanged).
    environment: 'node',

    include: [
      'unit/**/*.test.ts',
      'integration/**/*.test.ts',
      'component/**/*.test.{ts,tsx}',
    ],

    // Component tests run in jsdom so React can render into a simulated DOM.
    environmentMatchGlobs: [
      ['component/**', 'jsdom'],
    ],

    // Setup runs before every test file in both environments.
    // The file itself guards browser-only code with `typeof window !== 'undefined'`.
    setupFiles: ['./component/setup.ts'],

    // Expose vitest globals (describe, it, expect, vi, beforeEach, afterEach, …)
    // without explicit imports.  Required for @testing-library/react's
    // auto-cleanup to fire: RTL checks `typeof afterEach === 'function'` at
    // module load time and only registers the cleanup hook when it's a global.
    globals: true,

    // Auto-clear vi.fn() call history between tests so one test's calls don't
    // bleed into the next.
    clearMocks: true,

    testTimeout: 20000,
    hookTimeout: 20000,
  },

  // Force react-redux to be processed inline by vitest's transform (not
  // pre-bundled) so its internal "import * as React from 'react'" goes through
  // the same module registry as everything else.  Without this, the
  // pre-bundled react-redux chunk gets a separate ReactCurrentDispatcher
  // instance from react-dom, causing "Cannot read properties of null (reading
  // 'useMemo')" inside Provider.
  optimizeDeps: {
    exclude: ['react-redux', '@reduxjs/toolkit'],
  },

  resolve: {
    // Deduplicate ensures vite uses a single pre-bundled copy of each package.
    // react + react-dom are NOT in harness/node_modules — they live only in the
    // project root's node_modules so every import resolves to the same file
    // regardless of which package originates the import.
    dedupe: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit'],

    alias: [
      // Stub out react-ace — the real editor uses Worker/canvas APIs that
      // don't exist in jsdom.  The shim renders a plain <textarea>.
      // The regex matches the full specifier (via .*…$) so String.replace()
      // substitutes the entire import path, not just the substring.  It covers
      // both the old npm specifier ('react-ace') and the current relative path
      // ('…/utils/react-ace') after the package was inlined.
      {
        find: /.*react-ace$/,
        replacement: resolve(__dirname, 'component/__mocks__/react-ace.tsx'),
      },
      // Stub out ace-builds and all its sub-paths
      // (e.g. ace-builds/src-noconflict/mode-java).  The .* suffix in the
      // regex replaces the ENTIRE specifier, not just the 'ace-builds' prefix.
      {
        find: /^ace-builds.*/,
        replacement: resolve(__dirname, 'component/__mocks__/ace-stub.ts'),
      },
    ],
  },
});
