// Component tests for Results.
//
// Results renders two panes: a job list on the left and job details / spool
// output on the right.  These tests verify:
//   • empty-state messages (disconnected vs connected)
//   • job IDs appearing in the list
//   • the first job is auto-selected and its properties shown
//   • clicking a different job ID shows that job's properties
//   • a job with downloaded results shows the AceEditor shim

import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import Results from '../../app/components/Results';
import { createTestStore, renderWithStore, type PreloadedTestState } from './testUtils';

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

// Stub jesFtp so the pollJobStatus() useEffect doesn't try a real FTP poll.
vi.mock('../../app/utils/jesFtp', () => ({
  default: {
    deleteJob:       vi.fn(() => Promise.resolve()),
    retrieveJob:     vi.fn(() => Promise.resolve()),
    pollJobStatus:   vi.fn(() => Promise.resolve()),
    connect:         vi.fn(() => Promise.resolve()),
    disconnect:      vi.fn(() => Promise.resolve()),
    listDatasets:    vi.fn(() => Promise.resolve()),
    retrieveMember:  vi.fn(() => Promise.resolve()),
    submitJob:       vi.fn(() => Promise.resolve()),
  },
  pollJobStatus: vi.fn(),
  listDatasets:  vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const JOB_ALPHA = {
  jobID:              'JOB00001',
  owner:              'IBMUSER',
  status:             'OUTPUT',
  numberOfSpoolFiles: '3',
};
const JOB_BETA = {
  jobID:              'JOB00002',
  owner:              'IBMUSER',
  status:             'ACTIVE',
  numberOfSpoolFiles: '0',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderResults(stateOverrides: PreloadedTestState = {}) {
  const store = createTestStore(stateOverrides);
  return { ...renderWithStore(<Results />, { store }), store };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Results', () => {
  describe('empty state', () => {
    it('shows a "Connect and Refresh" prompt when disconnected with no jobs', () => {
      renderResults();
      expect(
        screen.getByText('Connect and Refresh to see results!')
      ).toBeInTheDocument();
    });

    it('shows a "queue is empty" message when connected but no jobs', () => {
      renderResults({ results: { isConnected: true } });
      expect(
        screen.getByText('Connected, but the Mainframe queue is empty')
      ).toBeInTheDocument();
    });
  });

  describe('job list', () => {
    it('renders job IDs in the list', () => {
      renderResults({ jobs: { [JOB_ALPHA.jobID]: JOB_ALPHA } });
      expect(screen.getByText('JOB00001')).toBeInTheDocument();
    });

    it('renders multiple job IDs', () => {
      renderResults({
        jobs: {
          [JOB_ALPHA.jobID]: JOB_ALPHA,
          [JOB_BETA.jobID]:  JOB_BETA,
        },
      });
      expect(screen.getByText('JOB00001')).toBeInTheDocument();
      expect(screen.getByText('JOB00002')).toBeInTheDocument();
    });
  });

  describe('job detail panel', () => {
    it('auto-selects and shows the first job\'s properties', () => {
      renderResults({ jobs: { [JOB_ALPHA.jobID]: JOB_ALPHA } });
      expect(screen.getByText(/Job ID:.*JOB00001/)).toBeInTheDocument();
      expect(screen.getByText(/Owner:.*IBMUSER/)).toBeInTheDocument();
      expect(screen.getByText(/Status:.*OUTPUT/)).toBeInTheDocument();
      expect(screen.getByText(/# Files:.*3/)).toBeInTheDocument();
    });

    it('switches detail to the clicked job', () => {
      renderResults({
        jobs: {
          [JOB_ALPHA.jobID]: JOB_ALPHA,
          [JOB_BETA.jobID]:  JOB_BETA,
        },
      });
      // Click the second job in the list
      fireEvent.click(screen.getByText('JOB00002'));
      expect(screen.getByText(/Status:.*ACTIVE/)).toBeInTheDocument();
      expect(screen.queryByText(/Status:.*OUTPUT/)).not.toBeInTheDocument();
    });

    it('renders a Delete button for jobs with spool files', () => {
      renderResults({ jobs: { [JOB_ALPHA.jobID]: JOB_ALPHA } });
      expect(
        screen.getByRole('button', { name: /Delete/i })
      ).toBeInTheDocument();
    });

    it('renders a Download button only for jobs with spool files', () => {
      // JOB_ALPHA has 3 spool files → Download button visible
      renderResults({ jobs: { [JOB_ALPHA.jobID]: JOB_ALPHA } });
      expect(
        screen.getByRole('button', { name: /Download/i })
      ).toBeInTheDocument();
    });

    it('omits the Download button for jobs with 0 spool files', () => {
      renderResults({ jobs: { [JOB_BETA.jobID]: JOB_BETA } });
      expect(
        screen.queryByRole('button', { name: /Download/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('downloaded results', () => {
    it('shows the AceEditor shim with spool output when results are present', () => {
      const jobWithResults = { ...JOB_ALPHA, results: '//STEP001 RC=0000\nHELLO MAINFRAME' };
      renderResults({ jobs: { JOB00001: jobWithResults } });
      // The AceEditor mock renders a <textarea data-testid="ace-editor-RESULTS">
      const editor = screen.getByTestId('ace-editor-RESULTS') as HTMLTextAreaElement;
      expect(editor).toBeInTheDocument();
      expect(editor.value).toContain('HELLO MAINFRAME');
    });
  });
});
