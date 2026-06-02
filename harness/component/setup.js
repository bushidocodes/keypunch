// Global test setup — runs before every test file in both 'node' and 'jsdom'
// environments.  Browser-specific code is guarded by `typeof window` checks.

import { vi } from 'vitest';
import '@testing-library/jest-dom/vitest'; // extends vitest's expect with toBeInTheDocument(), etc.

// Provide a mock window.keypunch bridge for jsdom component tests.
// vi.fn() stubs are used so tests can assert on calls; clearMocks:true in
// vitest.config.js resets them between tests automatically.
if (typeof window !== 'undefined') {
  window.keypunch = {
    jes: {
      setCredentials:          vi.fn(() => Promise.resolve()),
      connect:                 vi.fn(() => Promise.resolve()),
      disconnect:              vi.fn(() => Promise.resolve()),
      pollJobs:                vi.fn(() => Promise.resolve([])),
      submitJob:               vi.fn(() => Promise.resolve()),
      retrieveJob:             vi.fn(() => Promise.resolve('')),
      deleteJob:               vi.fn(() => Promise.resolve()),
      listDatasets:            vi.fn(() => Promise.resolve([])),
      listMembers:             vi.fn(() => Promise.resolve([])),
      listDatasetsWithMembers: vi.fn(() => Promise.resolve({ datasetRows: [], memberRowsByDs: {} })),
    },
    openFile:      vi.fn(() => Promise.resolve(null)),
    saveFile:      vi.fn(() => Promise.resolve(null)),
    confirmSubmit: vi.fn(() => Promise.resolve(false)),
    confirm:       vi.fn(() => Promise.resolve(false)),
    onMenu:        vi.fn(() => () => {}),
  };
}
