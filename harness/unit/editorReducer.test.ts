import { describe, it, expect } from 'vitest';
import type { Reducer } from '@reduxjs/toolkit';
import editorReducer from '../../app/reducers/editor';
import { setEditorContent, setEditorPath } from '../../app/actions/editor';

const reducer = editorReducer as Reducer<ReturnType<typeof editorReducer>>;

describe('editor reducer', () => {
  it('has the expected initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({ editorContent: '', editorPath: '' });
  });

  it('sets editorContent without mutating prior state', () => {
    const start = reducer(undefined, { type: '@@INIT' });
    const next = reducer(start, setEditorContent('IDENTIFICATION DIVISION.'));
    expect(next.editorContent).toBe('IDENTIFICATION DIVISION.');
    expect(start.editorContent).toBe('');
  });

  it('sets editorPath', () => {
    const state = reducer(undefined, setEditorPath('/home/user/program.cbl'));
    expect(state.editorPath).toBe('/home/user/program.cbl');
  });

  it('updates content while preserving path', () => {
    let state = reducer(undefined, setEditorPath('/foo.cbl'));
    state = reducer(state, setEditorContent('PROGRAM-ID. HELLO.'));
    expect(state.editorPath).toBe('/foo.cbl');
    expect(state.editorContent).toBe('PROGRAM-ID. HELLO.');
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
