import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // @vitejs/plugin-react handles JSX + Fast-Refresh for component tests.
  // It has no effect on the plain-JS unit/integration tests.
  plugins: [react()],

  test: {
    // Default environment for unit / integration tests (unchanged).
    environment: 'node',

    include: [
      'unit/**/*.test.js',
      'integration/**/*.test.js',
      'component/**/*.test.{js,jsx,ts,tsx}',
    ],

    // Component tests run in jsdom so React can render into a simulated DOM.
    environmentMatchGlobs: [
      ['component/**', 'jsdom'],
    ],

    // Setup runs before every test file in both environments.
    // The file itself guards browser-only code with `typeof window !== 'undefined'`.
    setupFiles: ['./component/setup.js'],

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
  // pre-bundled react-redux chunk can reference a different ReactCurrentDispatcher
  // than what react-dom sets up, causing "Cannot read properties of null
  // (reading 'useMemo')" inside Provider.
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
      {
        find: 'react-ace',
        replacement: resolve(__dirname, 'component/__mocks__/react-ace.js'),
      },
      // Stub out ace-builds and all its sub-paths
      // (e.g. ace-builds/src-noconflict/mode-java).  The .* suffix in the
      // regex replaces the ENTIRE specifier, not just the 'ace-builds' prefix.
      {
        find: /^ace-builds.*/,
        replacement: resolve(__dirname, 'component/__mocks__/ace-stub.js'),
      },
    ],
  },
});
