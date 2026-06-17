// ESLint flat config (TypeScript, loaded via jiti). Pragmatic, not airbnb-strict:
// the goal is catching real problems (unused vars/imports, obvious bugs), not
// stylistic noise.
//
// The whole codebase is now TypeScript, so every source area is linted through
// typescript-eslint:
//   - app/**        : the React 19 renderer (TSX, ESM, browser+node).
//   - electron/**   : main + preload (TS, ESM, Node, import.meta).
//   - harness/**    : the verification harness (TS/TSX, ESM, Node, vitest/playwright).
//   - *.config.ts   : the electron-vite / vitest / playwright build+test configs.

import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Every TypeScript file we lint (source, harness, and config files). harness
// config files (vitest/playwright) are covered by the harness/** glob; only the
// root configs need their own entries.
const TS_FILES = [
  'app/**/*.{ts,tsx}',
  'electron/**/*.{ts,tsx}',
  'harness/**/*.{ts,tsx}',
  '*.config.{ts,mts,cts}',
  'eslint.config.ts',
];

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

  // --- TypeScript: typescript-eslint's recommended set, applied to every
  // .ts/.tsx across the app, electron, the harness, and the build/test configs.
  // Lightweight (no type-aware linting / project service) to keep `npm run lint`
  // fast and the config simple.
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: TS_FILES
  })),
  {
    files: TS_FILES,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      // `import.meta.url`, browser/node globals, vitest globals, etc. are all
      // resolved by TypeScript; the base no-undef is redundant (and wrong) here.
      'no-undef': 'off'
    }
  },

  // --- React component tests: harness/component/**/*.tsx render real components
  // with JSX, so apply the React + hooks rules (mirrors how the renderer's .jsx
  // files were linted before the TypeScript conversion). The app's own .tsx
  // components are linted by typescript-eslint above, as they were pre-conversion.
  {
    files: ['harness/component/**/*.tsx'],
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    settings: {
      // Pin the version: `detect` makes eslint-plugin-react@7 probe the filesystem
      // via the removed ESLint `context.getFilename()` API, which throws on ESLint 10.
      react: { version: '19' }
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs['recommended-latest'].rules,
      // The automatic JSX runtime means `import React` is unnecessary.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Tests don't declare prop-types.
      'react/prop-types': 'off'
    }
  }
];
