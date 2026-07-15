import type { Reducer } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import {
  setFtpPassword,
  setFtpPort,
  setFtpsEnabled,
  setFtpUserName,
  setHostName,
} from '../../app/actions/configForm';
import configReducer from '../../app/reducers/config';

// The reducer is typed to its own narrow action union; widen to a generic
// Reducer here so the synthetic `@@INIT` / unknown actions the tests dispatch
// typecheck (a real reducer must tolerate any action — that's the `default` arm).
const reducer = configReducer as Reducer<ReturnType<typeof configReducer>>;

describe('config reducer', () => {
  it('has the expected initial state', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({
      hostName: '',
      ftpPort: '21',
      ftpUserName: '',
      ftpPassword: '',
      ftpsEnabled: false,
    });
  });

  it('sets hostName without mutating prior state', () => {
    const start = reducer(undefined, { type: '@@INIT' });
    const next = reducer(start, setHostName('mainframe.example.com'));
    expect(next.hostName).toBe('mainframe.example.com');
    expect(start.hostName).toBe('');
  });

  it('sets ftpPort', () => {
    const state = reducer(undefined, setFtpPort('990'));
    expect(state.ftpPort).toBe('990');
  });

  it('sets ftpUserName', () => {
    const state = reducer(undefined, setFtpUserName('IBMUSER'));
    expect(state.ftpUserName).toBe('IBMUSER');
  });

  it('sets ftpPassword', () => {
    const state = reducer(undefined, setFtpPassword('secret'));
    expect(state.ftpPassword).toBe('secret');
  });

  it('toggles ftpsEnabled from false to true', () => {
    const start = reducer(undefined, { type: '@@INIT' });
    expect(start.ftpsEnabled).toBe(false);
    const next = reducer(start, setFtpsEnabled(true));
    expect(next.ftpsEnabled).toBe(true);
  });

  it('returns the same state reference for unknown actions', () => {
    const state = reducer(undefined, { type: '@@INIT' });
    expect(reducer(state, { type: 'NOT_A_REAL_ACTION' })).toBe(state);
  });
});
