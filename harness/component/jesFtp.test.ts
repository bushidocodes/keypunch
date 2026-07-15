// Tests for the jesFtp.ts renderer-side JES client.
//
// Lives in component/ rather than unit/ because it needs the jsdom environment
// (setup.ts wires up window.keypunch there). No React rendering is involved.
//
// Primary coverage: every JES operation clears errorMessage on success and
// sets it on failure (PR #60 — "Clear JES error message on successful ops").

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setErrorMessage } from '../../app/actions/results';

// Build a controlled Redux store that jesFtp.ts's `import { store }` resolves
// to. vi.mock is hoisted before static imports, so the mocked store is in
// place when jesFtp.ts is first evaluated.
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

// Import the mocked store (resolved from vi.mock above) and the module under test.
import { store } from '../../app/index';
import jes from '../../app/utils/jesFtp';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIOR_ERROR = 'JES error: connect ECONNREFUSED 127.0.0.1:1';

/** Seed a stale error into the store before each operation test. */
function seedError() {
  store.dispatch(setErrorMessage(PRIOR_ERROR));
  expect(store.getState().results.errorMessage).toBe(PRIOR_ERROR);
}

function errorMessage() {
  return store.getState().results.errorMessage;
}

// ── Success path — error cleared ──────────────────────────────────────────────

// The fixture data below satisfies the parsers that run on the bridge's return
// value. parseJobs([]) throws, so pollJobs must return the known empty-queue
// sentinel; parseDatasets([]) throws, so listDatasetsWithMembers must return at
// least a header row. The setup.ts stubs use [] / {} which don't parse cleanly.
const EMPTY_JES_QUEUE = ['No jobs found on Held queue'];
const DATASETS_HEADER = [
  'Volume  Unit    Referred Ext Used Recfm Lrecl Blksz Dsorg  Dsname',
];

describe('jesFtp — errorMessage cleared on success', () => {
  beforeEach(() => {
    seedError();
    // Override the two stubs whose default return values fail the parsers.
    vi.mocked(window.keypunch.jes.pollJobs).mockResolvedValue(EMPTY_JES_QUEUE);
    vi.mocked(window.keypunch.jes.listDatasetsWithMembers).mockResolvedValue({
      datasetRows: DATASETS_HEADER,
      memberRowsByDs: {},
    });
  });

  it('connect() clears errorMessage after successful connect', async () => {
    await jes.connect();
    expect(errorMessage()).toBe('');
  });

  it('pollJobStatus() clears errorMessage after successful poll', async () => {
    await jes.pollJobStatus();
    expect(errorMessage()).toBe('');
  });

  it('submitJob() clears errorMessage after successful submit', async () => {
    await jes.submitJob('//IBMUSER JOB\n// EXEC PGM=IEFBR14\n');
    expect(errorMessage()).toBe('');
  });

  it('deleteJob() clears errorMessage after successful delete', async () => {
    await jes.deleteJob('JOB00045');
    expect(errorMessage()).toBe('');
  });

  it('retrieveJob() clears errorMessage after successful retrieve', async () => {
    await jes.retrieveJob('JOB00045');
    expect(errorMessage()).toBe('');
  });

  it('listDatasets() clears errorMessage after successful listing', async () => {
    await jes.listDatasets();
    expect(errorMessage()).toBe('');
  });

  it('retrieveMember() clears errorMessage after successful member fetch', async () => {
    await jes.retrieveMember('IBMUSER.SOURCE', 'HELLO');
    expect(errorMessage()).toBe('');
  });
});

// ── Failure path — error set, not cleared ────────────────────────────────────

describe('jesFtp — errorMessage set on failure', () => {
  beforeEach(() => {
    // Start with a clean slate for failure tests.
    store.dispatch(setErrorMessage(''));
  });

  it('connect() sets errorMessage when the bridge throws', async () => {
    vi.mocked(window.keypunch.jes.connect).mockRejectedValueOnce(
      new Error('ECONNREFUSED 127.0.0.1:1')
    );
    await jes.connect();
    expect(errorMessage()).toMatch(/JES error:/);
    expect(errorMessage()).toContain('ECONNREFUSED');
  });

  it('pollJobStatus() sets errorMessage when the bridge throws', async () => {
    vi.mocked(window.keypunch.jes.pollJobs).mockRejectedValueOnce(
      new Error('timeout')
    );
    await jes.pollJobStatus();
    expect(errorMessage()).toMatch(/JES error:.*timeout/);
  });

  it('submitJob() sets errorMessage when the bridge throws', async () => {
    vi.mocked(window.keypunch.jes.submitJob).mockRejectedValueOnce(
      new Error('not connected')
    );
    await jes.submitJob('//JCL');
    expect(errorMessage()).toMatch(/JES error:/);
  });

  it('deleteJob() sets errorMessage when the bridge throws', async () => {
    vi.mocked(window.keypunch.jes.deleteJob).mockRejectedValueOnce(
      new Error('job not found')
    );
    await jes.deleteJob('JOB99999');
    expect(errorMessage()).toMatch(/JES error:/);
  });

  it('retrieveJob() sets errorMessage when the bridge throws', async () => {
    vi.mocked(window.keypunch.jes.retrieveJob).mockRejectedValueOnce(
      new Error('spool missing')
    );
    await jes.retrieveJob('JOB00045');
    expect(errorMessage()).toMatch(/JES error:/);
  });

  it('listDatasets() sets errorMessage when the bridge throws', async () => {
    vi.mocked(
      window.keypunch.jes.listDatasetsWithMembers
    ).mockRejectedValueOnce(new Error('session expired'));
    await jes.listDatasets();
    expect(errorMessage()).toMatch(/JES error:/);
  });

  it('retrieveMember() sets errorMessage when the bridge throws', async () => {
    vi.mocked(window.keypunch.jes.retrieveMember).mockRejectedValueOnce(
      new Error('member not found')
    );
    await jes.retrieveMember('IBMUSER.SOURCE', 'MISSING');
    expect(errorMessage()).toMatch(/JES error:/);
  });
});

// ── Probe: failure does NOT clear a prior error ───────────────────────────────

describe('jesFtp — failure preserves prior error context', () => {
  it('a failed op overwrites (not clears) the previous error', async () => {
    store.dispatch(setErrorMessage('first error'));
    vi.mocked(window.keypunch.jes.connect).mockRejectedValueOnce(
      new Error('second error')
    );
    await jes.connect();
    expect(errorMessage()).toMatch(/second error/);
    expect(errorMessage()).not.toBe('');
  });
});
