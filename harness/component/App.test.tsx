// Component tests for App.
//
// App is the layout shell: sidebar nav with 4 NavLinks + <Outlet /> + StatusBar.
// It applies theme-dark or theme-light on .app-root based on Redux uiStyle.theme.
// Tests use MemoryRouter so we can control the active route.

import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../app/components/App';
import {
  createTestStore,
  type PreloadedTestState,
  renderWithStore,
} from './testUtils';

vi.mock('../../app/index', async () => {
  const { combineReducers, configureStore } = await import('@reduxjs/toolkit');
  const { default: editor } = await import('../../app/reducers/editor');
  const { default: explorer } = await import('../../app/reducers/explorer');
  const { default: config } = await import('../../app/reducers/config');
  const { default: results } = await import('../../app/reducers/results');
  const { default: uiStyle } = await import('../../app/reducers/uiStyle');
  const { default: jobs } = await import('../../app/reducers/jobs');
  const { default: datasets } = await import('../../app/reducers/datasets');
  const rootReducer = combineReducers({
    editor,
    explorer,
    config,
    results,
    uiStyle,
    jobs,
    datasets,
  });
  return {
    store: configureStore({
      reducer: rootReducer,
      middleware: (gDM) =>
        gDM({ immutableCheck: false, serializableCheck: false }),
    }),
  };
});

// Stub jesFtp so no FTP calls escape to the main process.
vi.mock('../../app/utils/jesFtp', () => ({
  default: {
    connect: vi.fn(() => Promise.resolve()),
    disconnect: vi.fn(() => Promise.resolve()),
    submitJob: vi.fn(() => Promise.resolve()),
    pollJobStatus: vi.fn(() => Promise.resolve()),
    listDatasets: vi.fn(() => Promise.resolve()),
    retrieveMember: vi.fn(() => Promise.resolve()),
    deleteJob: vi.fn(() => Promise.resolve()),
    retrieveJob: vi.fn(() => Promise.resolve()),
  },
  pollJobStatus: vi.fn(),
  listDatasets: vi.fn(),
}));

vi.mock('../../app/utils/nativeDialogs', () => ({
  testConnectivity: vi.fn(),
  openFilePicker: vi.fn(),
  newFile: vi.fn(),
  saveFile: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderApp(
  stateOverrides: PreloadedTestState = {},
  initialPath = '/editor'
) {
  const store = createTestStore(stateOverrides);
  const ui = (
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );
  return { ...renderWithStore(ui, { store }), store };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('App', () => {
  describe('nav pane', () => {
    it('renders 4 nav items', () => {
      const { container } = renderApp();
      const navItems = container.querySelectorAll('.nav-item');
      expect(navItems).toHaveLength(4);
    });

    it('renders nav items with the correct titles', () => {
      renderApp();
      expect(screen.getByTitle('edit')).toBeInTheDocument();
      expect(screen.getByTitle('results')).toBeInTheDocument();
      expect(screen.getByTitle('explorer')).toBeInTheDocument();
      expect(screen.getByTitle('config')).toBeInTheDocument();
    });

    it('applies nav-item-active class to the current route', () => {
      const { container } = renderApp({}, '/editor');
      const activeItems = container.querySelectorAll('.nav-item-active');
      expect(activeItems.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('theme class', () => {
    it('applies theme-dark class on .app-root by default', () => {
      const { container } = renderApp();
      expect(container.querySelector('.app-root')).toHaveClass('theme-dark');
    });

    it('applies theme-light class when uiStyle.theme is light', () => {
      const { container } = renderApp({ uiStyle: { theme: 'light' } });
      expect(container.querySelector('.app-root')).toHaveClass('theme-light');
    });
  });

  describe('status bar', () => {
    it('renders the StatusBar (TEST button visible)', () => {
      renderApp();
      expect(screen.getByRole('button', { name: 'TEST' })).toBeInTheDocument();
    });
  });
});
