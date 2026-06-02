// Component tests for StatusBar.
//
// StatusBar shows CONNECT / INTERRUPT depending on `isConnected`, renders
// four indicator lamps (CONN / SENT / RETR / DISC), and has a TEST button.
// These tests verify the rendering logic without triggering real FTP calls.

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import StatusBar from '../../app/components/StatusBar';
import { createTestStore, renderWithStore } from './testUtils.jsx';

vi.mock('../../app/index', async () => {
  const { combineReducers, configureStore } = await import('@reduxjs/toolkit');
  const { default: editor }   = await import('../../app/reducers/editor');
  const { default: explorer } = await import('../../app/reducers/explorer');
  const { default: config }   = await import('../../app/reducers/config');
  const { default: results }  = await import('../../app/reducers/results');
  const { default: uiStyle }  = await import('../../app/reducers/uiStyle');
  const { default: jobs }     = await import('../../app/reducers/jobs');
  const { default: datasets } = await import('../../app/reducers/datasets');
  const rootReducer = combineReducers({ editor, explorer, config, results, uiStyle, jobs, datasets });
  return {
    store: configureStore({
      reducer: rootReducer,
      middleware: (gDM) => gDM({ immutableCheck: false, serializableCheck: false }),
    }),
  };
});

// Stub jesFtp so connect / disconnect / submitJob don't reach the main process.
vi.mock('../../app/utils/jesFtp', () => ({
  default: {
    connect:         vi.fn(() => Promise.resolve()),
    disconnect:      vi.fn(() => Promise.resolve()),
    submitJob:       vi.fn(() => Promise.resolve()),
    pollJobStatus:   vi.fn(() => Promise.resolve()),
    listDatasets:    vi.fn(() => Promise.resolve()),
    retrieveMember:  vi.fn(() => Promise.resolve()),
    deleteJob:       vi.fn(() => Promise.resolve()),
    retrieveJob:     vi.fn(() => Promise.resolve()),
  },
  pollJobStatus: vi.fn(),
  listDatasets:  vi.fn(),
}));

// Stub nativeDialogs so the TEST button doesn't fire a cascade of setTimeout
// dispatches that would bleed into subsequent tests.
vi.mock('../../app/utils/nativeDialogs', () => ({
  testIndicators: vi.fn(),
  openFilePicker: vi.fn(),
  newFile:        vi.fn(),
  saveFile:       vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Render StatusBar with partial results state overrides. */
function renderStatusBar(resultsOverrides = {}) {
  const store = createTestStore({ results: resultsOverrides });
  return { ...renderWithStore(<StatusBar />, { store }), store };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StatusBar', () => {
  describe('connect / interrupt button', () => {
    it('shows the CONNECT button when isConnected is false (default)', () => {
      renderStatusBar();
      expect(screen.getByRole('button', { name: 'CONNECT' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'INTERRUPT' })).not.toBeInTheDocument();
    });

    it('shows the INTERRUPT button when isConnected is true', () => {
      renderStatusBar({ isConnected: true });
      expect(screen.getByRole('button', { name: 'INTERRUPT' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'CONNECT' })).not.toBeInTheDocument();
    });
  });

  describe('indicator lamps', () => {
    it('renders all four indicator labels: CONN, SENT, RETR, DISC', () => {
      renderStatusBar();
      ['CONN', 'SENT', 'RETR', 'DISC'].forEach((label) => {
        expect(screen.getByText(label)).toBeInTheDocument();
      });
    });

    it('renders four SVG circles (one per indicator)', () => {
      const { container } = renderStatusBar();
      expect(container.querySelectorAll('svg circle')).toHaveLength(4);
    });

    it('renders unlit circles when all indicator flags are false', () => {
      const { container } = renderStatusBar();
      const circles = container.querySelectorAll('svg circle');
      // Default unlitColor is '#000'
      circles.forEach((c) => expect(c.getAttribute('fill')).toBe('#000'));
    });

    it('renders a lit circle for CONN when isConnected is true', () => {
      const { container } = renderStatusBar({ isConnected: true });
      // CONN is the first indicator — its circle fill should be the litColor
      const connCircle = container.querySelectorAll('svg circle')[0];
      expect(connCircle.getAttribute('fill')).toBe('#FEFDFE');
    });
  });

  describe('TEST button', () => {
    it('renders the TEST button', () => {
      renderStatusBar();
      expect(screen.getByRole('button', { name: 'TEST' })).toBeInTheDocument();
    });

    it('calls testIndicators when the TEST button is clicked', async () => {
      const { testIndicators } = await import('../../app/utils/nativeDialogs');
      renderStatusBar();
      fireEvent.click(screen.getByRole('button', { name: 'TEST' }));
      expect(testIndicators).toHaveBeenCalledOnce();
    });
  });

  describe('LOAD button', () => {
    it('renders the LOAD button', () => {
      renderStatusBar();
      expect(screen.getByRole('button', { name: 'LOAD' })).toBeInTheDocument();
    });
  });
});
