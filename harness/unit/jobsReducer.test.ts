import { describe, it, expect } from 'vitest';
import type { Reducer } from '@reduxjs/toolkit';
import jobsReducer from '../../app/reducers/jobs';
import { refreshJobs, loadJobResults } from '../../app/actions/jobs';
import type { Job } from '../../app/utils/jesParse';

const reducer = jobsReducer as Reducer<ReturnType<typeof jobsReducer>>;

const JOB_A: Job = {
  jobID: 'JOB00001',
  owner: 'IBMUSER',
  status: 'OUTPUT',
  numberOfSpoolFiles: '3',
  fullString: 'IBMUSER JOB00001 OUTPUT 3 Spool Files',
};

const JOB_B: Job = {
  jobID: 'JOB00002',
  owner: 'IBMUSER',
  status: 'ACTIVE',
  numberOfSpoolFiles: '0',
  fullString: 'IBMUSER JOB00002 ACTIVE',
};

describe('jobs reducer', () => {
  it('has the expected initial state (empty object)', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({});
  });

  it('populates jobs on REFRESH_JOBS', () => {
    const jobs = { [JOB_A.jobID]: JOB_A };
    const state = reducer(undefined, refreshJobs(jobs));
    expect(state[JOB_A.jobID]).toMatchObject({ jobID: 'JOB00001', status: 'OUTPUT' });
  });

  it('preserves previously-downloaded results on re-poll (merge semantics)', () => {
    // First poll: JOB_A arrives; results are downloaded and stored.
    let state = reducer(undefined, refreshJobs({ [JOB_A.jobID]: JOB_A }));
    state = reducer(state, loadJobResults('JOB00001', '//STEP001 RC=0000\n'));

    // Second poll: refreshed JOB_A comes back (same job, updated status).
    const refreshedA = { ...JOB_A, status: 'CC 0000' };
    state = reducer(state, refreshJobs({ [JOB_A.jobID]: refreshedA }));

    // Results must survive the re-poll.
    expect(state[JOB_A.jobID].results).toBe('//STEP001 RC=0000\n');
    expect(state[JOB_A.jobID].status).toBe('CC 0000');
  });

  it('adds new jobs while keeping existing ones on REFRESH_JOBS', () => {
    let state = reducer(undefined, refreshJobs({ [JOB_A.jobID]: JOB_A }));
    state = reducer(state, refreshJobs({ [JOB_A.jobID]: JOB_A, [JOB_B.jobID]: JOB_B }));
    expect(Object.keys(state)).toHaveLength(2);
  });

  it('removes jobs that are absent from the new snapshot (replace semantics)', () => {
    // First poll: both jobs arrive.
    let state = reducer(undefined, refreshJobs({ [JOB_A.jobID]: JOB_A, [JOB_B.jobID]: JOB_B }));
    // Second poll: only JOB_B is returned (JOB_A finished/purged on the server).
    state = reducer(state, refreshJobs({ [JOB_B.jobID]: JOB_B }));
    expect(state[JOB_A.jobID]).toBeUndefined();
    expect(state[JOB_B.jobID]).toBeDefined();
  });

  it('attaches results to a specific job on LOAD_JOB_RESULTS', () => {
    let state = reducer(undefined, refreshJobs({ [JOB_A.jobID]: JOB_A }));
    state = reducer(state, loadJobResults('JOB00001', 'spool output here'));
    expect(state['JOB00001'].results).toBe('spool output here');
  });

  it('does not mutate prior state on LOAD_JOB_RESULTS', () => {
    const start = reducer(undefined, refreshJobs({ [JOB_A.jobID]: JOB_A }));
    reducer(start, loadJobResults('JOB00001', 'output'));
    expect(start['JOB00001'].results).toBeUndefined();
  });

  it('ignores LOAD_JOB_RESULTS for an unknown jobID', () => {
    const state = reducer(undefined, loadJobResults('UNKNOWN', 'data'));
    expect(state).toEqual({});
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
