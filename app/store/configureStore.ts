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
import type { RootState } from '../reducers';

export default function configureStore(preloadedState?: Partial<RootState>) {
  const store = rtkConfigureStore({
    reducer: rootReducer,
    // RTK collapses each slice's PreloadedState to `never` for these
    // default-param reducers, so it won't accept a typed partial directly. The
    // public param above keeps callers honest; this cast bridges to RTK's type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    preloadedState: preloadedState as any,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
      }),
    devTools: import.meta.env.DEV,
  });

  if (import.meta.hot) {
    // HMR-only (dev): the new module's default reducer carries a different
    // PreloadedState generic than the store was created with, so `any` is the
    // pragmatic bridge here.
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
