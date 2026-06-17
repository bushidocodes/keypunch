import { describe, it, expect } from 'vitest';
import type { Reducer } from '@reduxjs/toolkit';
import explorerReducer from '../../app/reducers/explorer';
import { setExplorerContent } from '../../app/actions/explorer';

const reducer = explorerReducer as Reducer<ReturnType<typeof explorerReducer>>;

describe('explorer reducer', () => {
  it('has the expected initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({ explorerContent: '' });
  });

  it('sets explorerContent without mutating prior state', () => {
    const start = reducer(undefined, { type: '@@INIT' });
    const next = reducer(start, setExplorerContent('       IDENTIFICATION DIVISION.'));
    expect(next.explorerContent).toBe('       IDENTIFICATION DIVISION.');
    expect(start.explorerContent).toBe('');
  });

  it('replaces explorer content on a second dispatch', () => {
    let state = reducer(undefined, setExplorerContent('first content'));
    state = reducer(state, setExplorerContent('second content'));
    expect(state.explorerContent).toBe('second content');
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
