/// <reference types="vite/client" />
// Single Redux Toolkit store. RTK's `configureStore` wires up the thunk
// middleware (used by the jes.* action-creators that are dispatched as
// functions) and, in development, the dev-tools integration.
//
// The existing reducers mutate parts of their state in place (the legacy `jobs`
// reducer in particular), so RTK's immutable/serializable dev checks are
// disabled to avoid noisy false positives while preserving the exact reducer
// behaviour the harness unit tests assert against. redux-logger was dropped in
// the Phase-4 refresh (it added a CJS/ESM-interop wrinkle for no real benefit).
import { configureStore as rtkConfigureStore } from '@reduxjs/toolkit';
import rootReducer from '../reducers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function configureStore(preloadedState?: any) {
  const store = rtkConfigureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
      }),
    devTools: import.meta.env.DEV,
  });

  if (import.meta.hot) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import.meta.hot.accept('../reducers', (mod: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (mod) store.replaceReducer(mod.default as any);
    });
  }

  return store;
}

export type AppStore    = ReturnType<typeof configureStore>;
export type AppDispatch = AppStore['dispatch'];
