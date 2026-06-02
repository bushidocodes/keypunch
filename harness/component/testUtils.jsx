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

import { render } from '@testing-library/react';
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

export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ immutableCheck: false, serializableCheck: false }),
  });
}

export function renderWithStore(ui, options = {}) {
  const { store = createTestStore(), ...renderOptions } = options;

  function Wrapper({ children }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
