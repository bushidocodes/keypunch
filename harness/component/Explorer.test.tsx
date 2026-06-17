// Component tests for Explorer.
//
// Explorer is Redux-connected and renders a DatasetTree + read-only AceEditor.
// These tests verify:
//   • listDatasets() is called on mount
//   • DatasetTree receives datasets from Redux and renders them
//   • clicking a member calls jesFtp.retrieveMember
//   • the read-only AceEditor shim renders with explorerContent

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import Explorer from '../../app/components/Explorer';
import { createTestStore, renderWithStore, type PreloadedTestState } from './testUtils';
import type { Dataset } from '../../app/utils/jesParse';

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

// Stub jesFtp inline (no top-level variable) so hoisting works correctly.
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Minimal tree shape — only the fields DatasetTree/Explorer read. Cast to
// Dataset[] since the full column-attribute set is irrelevant here.
const SAMPLE_DATASETS = [
  {
    name: 'IBMUSER.SOURCE',
    attributes: { dsname: 'IBMUSER.SOURCE' },
    children: [
      { name: 'HELLO', attributes: { dsname: 'IBMUSER.SOURCE' } },
      { name: 'WORLD', attributes: { dsname: 'IBMUSER.SOURCE' } },
    ],
  },
] as unknown as Dataset[];

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderExplorer(stateOverrides: PreloadedTestState = {}) {
  const store = createTestStore(stateOverrides);
  return { ...renderWithStore(<Explorer />, { store }), store };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Explorer', () => {
  it('calls listDatasets on mount', async () => {
    const { listDatasets } = await import('../../app/utils/jesFtp');
    renderExplorer();
    expect(listDatasets).toHaveBeenCalled();
  });

  it('renders dataset names from Redux state', () => {
    renderExplorer({ datasets: SAMPLE_DATASETS });
    expect(screen.getByText('IBMUSER.SOURCE')).toBeInTheDocument();
  });

  it('shows members when a dataset is expanded', () => {
    renderExplorer({ datasets: SAMPLE_DATASETS });
    fireEvent.click(screen.getByText('IBMUSER.SOURCE'));
    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('WORLD')).toBeInTheDocument();
  });

  it('calls retrieveMember when a member is clicked', async () => {
    const jesFtp = (await import('../../app/utils/jesFtp')).default;
    renderExplorer({ datasets: SAMPLE_DATASETS });
    fireEvent.click(screen.getByText('IBMUSER.SOURCE'));
    fireEvent.click(screen.getByText('HELLO'));
    expect(jesFtp.retrieveMember).toHaveBeenCalledWith('IBMUSER.SOURCE', 'HELLO');
  });

  it('renders the read-only AceEditor shim', () => {
    renderExplorer();
    expect(screen.getByTestId('ace-editor-EXPLORER')).toBeInTheDocument();
  });

  it('passes explorerContent to the AceEditor shim', () => {
    renderExplorer({ explorer: { explorerContent: 'COBOL SOURCE HERE' } });
    const ta = screen.getByTestId('ace-editor-EXPLORER') as HTMLTextAreaElement;
    expect(ta.value).toBe('COBOL SOURCE HERE');
  });
});
