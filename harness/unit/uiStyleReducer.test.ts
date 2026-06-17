import { describe, it, expect } from 'vitest';
import type { Reducer } from '@reduxjs/toolkit';
import uiStyleReducer from '../../app/reducers/uiStyle';
import { setThemeDark, setThemeLight } from '../../app/actions/uiStyle';

const reducer = uiStyleReducer as Reducer<ReturnType<typeof uiStyleReducer>>;

describe('uiStyle action creators', () => {
  it('setThemeDark / setThemeLight return the expected actions', () => {
    expect(setThemeDark()).toEqual({ type: 'SET_THEME_DARK' });
    expect(setThemeLight()).toEqual({ type: 'SET_THEME_LIGHT' });
  });
});

describe('uiStyle reducer', () => {
  it('has the expected initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ theme: 'dark' });
  });

  it('toggles the theme light and back to dark', () => {
    let state = reducer(undefined, { type: '@@INIT' });
    state = reducer(state, setThemeLight());
    expect(state.theme).toBe('light');
    state = reducer(state, setThemeDark());
    expect(state.theme).toBe('dark');
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
