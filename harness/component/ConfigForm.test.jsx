// Component tests for ConfigForm.
//
// ConfigForm is a Redux-connected form with controlled inputs for FTP settings
// and a theme radio-group.  These tests verify:
//   • all fields render with their default values
//   • typing in an input dispatches the matching action and reflects in state
//   • the FTPS checkbox defaults to unchecked and can be toggled
//   • the theme radios default to "Dark" and switching works
//   • the useEffect syncs credentials to main on mount

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfigForm from '../../app/components/ConfigForm';
import { createTestStore, renderWithStore } from './testUtils.jsx';

vi.mock('../../app/index', async () => {
  const { combineReducers, configureStore } = await import('@reduxjs/toolkit');
  const { default: editor }   = await import('../../app/reducers/editor');
  const { default: explorer } = await import('../../app/reducers/explorer');
  const { default: config }   = await import('../../app/reducers/config');
  const { default: results }  = await import('../../app/reducers/results');
  const { default: uiStyle }  = await import('../../app/reducers/uiStyle');
  const { default: jobs }     = await import('../../app/reducers/jobs');
  const { default: datasets } = await import('../../app/reducers/datasets');
  const rootReducer = combineReducers({ editor, explorer, config, results, uiStyle, jobs, datasets });
  return {
    store: configureStore({
      reducer: rootReducer,
      middleware: (gDM) => gDM({ immutableCheck: false, serializableCheck: false }),
    }),
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConfigForm', () => {
  describe('initial render', () => {
    it('renders all labelled config fields', () => {
      renderWithStore(<ConfigForm />);
      expect(screen.getByText('Hostname or IP')).toBeInTheDocument();
      expect(screen.getByText('FTP Port')).toBeInTheDocument();
      expect(screen.getByText('FTP User Name')).toBeInTheDocument();
      expect(screen.getByText('FTP Password')).toBeInTheDocument();
      expect(screen.getByText('Use FTPS (TLS)')).toBeInTheDocument();
      expect(screen.getByText('Theme')).toBeInTheDocument();
    });

    it('shows default FTP port "21"', () => {
      renderWithStore(<ConfigForm />);
      // The port input value comes from the default Redux state (ftpPort: '21').
      expect(screen.getByDisplayValue('21')).toBeInTheDocument();
    });

    it('renders the FTPS checkbox unchecked by default', () => {
      renderWithStore(<ConfigForm />);
      const checkbox = screen.getByRole('checkbox', { name: /Encrypt connection with AUTH TLS/i });
      expect(checkbox).not.toBeChecked();
    });

    it('renders the Dark theme radio checked by default', () => {
      renderWithStore(<ConfigForm />);
      const darkRadio = screen.getByRole('radio', { name: /Dark/i });
      expect(darkRadio).toBeChecked();
    });

    it('calls jes.setCredentials on mount to seed main-process credential store', async () => {
      renderWithStore(<ConfigForm />);
      // useEffect fires after render; wait for async flush
      await waitFor(() => {
        expect(window.keypunch.jes.setCredentials).toHaveBeenCalled();
      });
    });
  });

  describe('hostname input', () => {
    it('updates Redux state when the user types a hostname', async () => {
      const store = createTestStore();
      renderWithStore(<ConfigForm />, { store });
      const input = screen.getByPlaceholderText('192.168.0.1');
      await userEvent.clear(input);
      await userEvent.type(input, 'my.mainframe.com');
      expect(store.getState().config.hostName).toBe('my.mainframe.com');
    });
  });

  describe('username input', () => {
    it('updates Redux state and re-syncs credentials when username changes', async () => {
      const store = createTestStore();
      renderWithStore(<ConfigForm />, { store });
      const input = screen.getByPlaceholderText('Gene.Amdahl');
      await userEvent.clear(input);
      await userEvent.type(input, 'IBMUSER');
      expect(store.getState().config.ftpUserName).toBe('IBMUSER');
      // setCredentials should have been called at least once more after typing
      await waitFor(() => {
        expect(window.keypunch.jes.setCredentials).toHaveBeenCalledWith('IBMUSER', '');
      });
    });
  });

  describe('FTPS checkbox', () => {
    it('toggles ftpsEnabled in Redux state when checked', () => {
      const store = createTestStore();
      renderWithStore(<ConfigForm />, { store });
      const checkbox = screen.getByRole('checkbox', { name: /Encrypt connection with AUTH TLS/i });
      fireEvent.click(checkbox);
      expect(store.getState().config.ftpsEnabled).toBe(true);
    });

    it('shows the TLS-required hint when FTPS is enabled', () => {
      const store = createTestStore({ config: { ftpsEnabled: true, hostName: '', ftpPort: '21', ftpUserName: '', ftpPassword: '' } });
      renderWithStore(<ConfigForm />, { store });
      expect(screen.getByText(/requires TLS-enabled z\/OS FTP server/i)).toBeInTheDocument();
    });

    it('hides the TLS hint when FTPS is disabled', () => {
      renderWithStore(<ConfigForm />);
      expect(screen.queryByText(/requires TLS-enabled z\/OS FTP server/i)).not.toBeInTheDocument();
    });
  });

  describe('theme radios', () => {
    it('switches to light theme when the Light radio is clicked', () => {
      const store = createTestStore();
      renderWithStore(<ConfigForm />, { store });
      fireEvent.click(screen.getByRole('radio', { name: /Light/i }));
      expect(store.getState().uiStyle.theme).toBe('light');
    });

    it('can switch back to dark theme', () => {
      const store = createTestStore({ uiStyle: { theme: 'light', color: 'cc7f29' } });
      renderWithStore(<ConfigForm />, { store });
      fireEvent.click(screen.getByRole('radio', { name: /Dark/i }));
      expect(store.getState().uiStyle.theme).toBe('dark');
    });
  });
});
