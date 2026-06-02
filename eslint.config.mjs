// ESLint flat config (eslint v9). Pragmatic, not airbnb-strict: the goal is
// catching real problems (unused vars/imports, obvious bugs), not stylistic
// noise. This replaces the old eslint 3 / airbnb config removed in Phase 1.
//
// Three source areas, each with its own globals/parser options:
//   - app/**      : the React 18 renderer (JSX inside .js, ESM, browser+node).
//   - electron/** : main + preload (ESM, Node, import.meta).
//   - harness/**  : the Phase 0 verification harness (ESM, Node, vitest globals).

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'out/**',
      '**/node_modules/**',
      'release/**',
      'harness/test-results/**',
      'harness/playwright-report/**'
    ]
  },

  // Base recommended rules for every linted file.
  js.configs.recommended,

  // --- Renderer: app/**/*.js (React 18, JSX in .js, automatic runtime) -------
  {
    files: ['app/**/*.js'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    settings: {
      react: { version: '18' }
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      // @vitejs/plugin-react uses the automatic JSX runtime, so `import React`
      // is no longer needed and `React` is not a referenced in-scope binding.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // The app doesn't use prop-types.
      'react/prop-types': 'off',
      'no-unused-vars': 'error'
    }
  },

  // --- Main + preload: electron/**/*.js (ESM, Node, import.meta) -------------
  {
    files: ['electron/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': 'error'
    }
  },

  // --- Verification harness: harness/**/*.js (ESM, Node, vitest/playwright) --
  {
    files: ['harness/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        // vitest globals so the unit tests don't trip no-undef.
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'error'
    }
  },

  // The e2e drives the renderer via Playwright; its `win.evaluate(() => ...)`
  // callbacks run in the BROWSER, so `window` must be a known global there.
  {
    files: ['harness/e2e/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser
      }
    }
  },

  // --- Build config (electron.vite.config.mjs): runs under Node, and Vite's
  // config loader injects CJS-style `__dirname`. ----------------------------
  {
    files: ['*.config.mjs', '*.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node
      }
    }
  }
];
