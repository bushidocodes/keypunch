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

export default function configureStore(preloadedState) {
  const store = rtkConfigureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false
      }),
    devTools: import.meta.env.DEV
  });

  if (import.meta.hot) {
    import.meta.hot.accept('../reducers', (mod) => {
      if (mod) store.replaceReducer(mod.default);
    });
  }

  return store;
}
