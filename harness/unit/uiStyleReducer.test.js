import { describe, it, expect } from 'vitest';
import reducer from '../../app/reducers/uiStyle.ts';
import { setThemeDark, setThemeLight, setColor } from '../../app/actions/uiStyle.ts';

describe('uiStyle action creators', () => {
  it('setColor returns a SET_COLOR action carrying the color', () => {
    // Regression guard (#10): setColor previously returned { type: SET_THEME_DARK },
    // so the accent color never actually changed. It must be SET_COLOR + color.
    expect(setColor('336699')).toEqual({ type: 'SET_COLOR', color: '336699' });
  });

  it('setThemeDark / setThemeLight return the expected actions', () => {
    expect(setThemeDark()).toEqual({ type: 'SET_THEME_DARK' });
    expect(setThemeLight()).toEqual({ type: 'SET_THEME_LIGHT' });
  });
});

describe('uiStyle reducer', () => {
  it('has the expected initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ theme: 'dark', color: 'cc7f29' });
  });

  it('setColor updates color and leaves theme untouched (and does not mutate prior state)', () => {
    const start = reducer(undefined, { type: '@@INIT' });
    const next = reducer(start, setColor('123456'));
    expect(next.color).toBe('123456');
    expect(next.theme).toBe('dark');
    expect(start.color).toBe('cc7f29');
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
