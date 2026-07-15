import type { Reducer } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { refreshDatasets } from '../../app/actions/datasets';
import datasetsReducer from '../../app/reducers/datasets';
import type { Dataset } from '../../app/utils/jesParse';

const reducer = datasetsReducer as Reducer<ReturnType<typeof datasetsReducer>>;

// Minimal tree nodes — only the fields these tests assert on. Cast to Dataset
// since the full column-attribute set is irrelevant to reducer behaviour.
const SAMPLE_DATASETS = [
  {
    name: 'IBMUSER.SOURCE',
    attributes: { dsname: 'IBMUSER.SOURCE' },
    children: [],
  },
  {
    name: 'IBMUSER.LOAD',
    attributes: { dsname: 'IBMUSER.LOAD' },
    children: [],
  },
] as unknown as Dataset[];

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
    const first = reducer(undefined, refreshDatasets(SAMPLE_DATASETS));
    const second = reducer(first, refreshDatasets([SAMPLE_DATASETS[0]]));
    expect(second).toHaveLength(1);
    expect(second[0].name).toBe('IBMUSER.SOURCE');
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
