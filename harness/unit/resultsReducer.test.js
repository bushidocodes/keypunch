import { describe, it, expect } from 'vitest';
import reducer from '../../app/reducers/results.js';
import {
  setIsConnected,
  setIsConnecting,
  setResultsContent,
  setCurrentStep
} from '../../app/actions/results.js';

describe('results reducer', () => {
  it('has the expected initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toMatchObject({
      resultsContent: 'Not yet submitted to mainframe',
      isConnected: false,
      isConnecting: false,
      isSubmitting: false,
      isRetrieving: false
    });
  });

  it('flips a single connection flag without disturbing the rest', () => {
    const start = reducer(undefined, { type: '@@INIT' });
    const next = reducer(start, setIsConnected(true));
    expect(next.isConnected).toBe(true);
    expect(next.isConnecting).toBe(false);
    // does not mutate the previous state object
    expect(start.isConnected).toBe(false);
  });

  it('sets results content and current step', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setResultsContent('JES output here'));
    state = reducer(state, setCurrentStep('retrieve'));
    expect(state.resultsContent).toBe('JES output here');
    expect(state.currentStep).toBe('retrieve');
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });

  it('action creators produce the documented shape', () => {
    expect(setIsConnecting(true)).toEqual({ type: 'SET_IS_CONNECTING', isConnecting: true });
  });
});
