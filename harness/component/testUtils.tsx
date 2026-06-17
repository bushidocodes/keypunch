// Shared test helpers for component tests.
//
// `createTestStore(preloadedState?)` — build a fresh Redux store from the
// real reducers, with optional preloaded state overrides.  Uses RTK directly
// to avoid the app's `configureStore` wrapper (which references
// `import.meta.hot` for HMR, irrelevant in tests).
//
// `renderWithStore(ui, { store?, ...renderOptions })` — render a React
// element wrapped in a Redux <Provider> and return the store alongside RTL's
// render result so tests can inspect / dispatch to state.

import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';

import editor   from '../../app/reducers/editor';
import explorer from '../../app/reducers/explorer';
import config   from '../../app/reducers/config';
import results  from '../../app/reducers/results';
import uiStyle  from '../../app/reducers/uiStyle';
import jobs     from '../../app/reducers/jobs';
import datasets from '../../app/reducers/datasets';

const rootReducer = combineReducers({
  editor,
  explorer,
  config,
  results,
  uiStyle,
  jobs,
  datasets,
});

type TestState = ReturnType<typeof rootReducer>;

/**
 * Recursive partial so a test can supply only the slice fields it cares about
 * (e.g. `{ results: { isConnected: true } }`).  The reducers tolerate partial
 * preloaded slices at runtime; the cast below bridges to RTK's stricter
 * full-slice PreloadedState typing.
 */
type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type PreloadedTestState = DeepPartial<TestState>;

export function createTestStore(preloadedState: PreloadedTestState = {}) {
  return configureStore({
    reducer: rootReducer,
    // RTK infers each slice's PreloadedState as `never` for reducers written with
    // a default-param state type (rather than the explicit Reducer<S, A, Preloaded>
    // form), so it rejects a real partial state. The reducers tolerate partial
    // preloaded slices at runtime; cast past the inference — the same reason
    // app/store/configureStore.ts takes its preloadedState as `any`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preloadedState: preloadedState as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }),
  });
}

export type TestStore = ReturnType<typeof createTestStore>;

interface RenderWithStoreOptions extends Omit<RenderOptions, 'wrapper'> {
  store?: TestStore;
}

export function renderWithStore(
  ui: ReactElement,
  options: RenderWithStoreOptions = {},
): RenderResult & { store: TestStore } {
  const { store = createTestStore(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
