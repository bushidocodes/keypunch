import { describe, it, expect } from 'vitest';
import reducer from '../../app/reducers/datasets.ts';
import { refreshDatasets } from '../../app/actions/datasets.ts';

const SAMPLE_DATASETS = [
  { name: 'IBMUSER.SOURCE', attributes: { dsname: 'IBMUSER.SOURCE' }, children: [] },
  { name: 'IBMUSER.LOAD',   attributes: { dsname: 'IBMUSER.LOAD'   }, children: [] },
];

describe('datasets reducer', () => {
  it('has the expected initial state (empty array)', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual([]);
  });

  it('replaces state with incoming datasets on REFRESH_DATASETS', () => {
    const next = reducer(undefined, refreshDatasets(SAMPLE_DATASETS));
    expect(next).toEqual(SAMPLE_DATASETS);
    expect(next).toHaveLength(2);
  });

  it('replaces previous datasets on a second refresh', () => {
    const first  = reducer(undefined, refreshDatasets(SAMPLE_DATASETS));
    const second = reducer(first, refreshDatasets([SAMPLE_DATASETS[0]]));
    expect(second).toHaveLength(1);
    expect(second[0].name).toBe('IBMUSER.SOURCE');
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
