// Unit tests for the DatasetTree collapsible-tree component.
//
// DatasetTree is a pure presentational component (no Redux connection).  It
// receives `datasets` + `onSelectMember` as props and manages its own
// expand/collapse state.  We can render it directly without a <Provider>.
//
// Because Explorer.tsx (where DatasetTree lives) imports react-ace and
// ace-builds at module level, the vitest.config resolve.alias stubs those out
// so the file can be loaded without WebWorker / canvas errors.

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatasetTree } from '../../app/components/Explorer';
import type { Dataset, Member } from '../../app/utils/jesParse';

// Explorer.tsx -> jesFtp -> app/index (creates the Redux store singleton).
// Mock app/index so the store singleton doesn't try to mount a React root or
// call window.keypunch.onMenu.
vi.mock('../../app/index', async () => {
  const { combineReducers, configureStore } = await import('@reduxjs/toolkit');
  const { default: editor } = await import('../../app/reducers/editor');
  const { default: explorer } = await import('../../app/reducers/explorer');
  const { default: config } = await import('../../app/reducers/config');
  const { default: results } = await import('../../app/reducers/results');
  const { default: uiStyle } = await import('../../app/reducers/uiStyle');
  const { default: jobs } = await import('../../app/reducers/jobs');
  const { default: datasets } = await import('../../app/reducers/datasets');
  const rootReducer = combineReducers({
    editor,
    explorer,
    config,
    results,
    uiStyle,
    jobs,
    datasets,
  });
  return {
    store: configureStore({
      reducer: rootReducer,
      middleware: (gDM) =>
        gDM({ immutableCheck: false, serializableCheck: false }),
    }),
  };
});

// Stub jesFtp so Explorer.tsx's useEffect doesn't fire real FTP calls.
vi.mock('../../app/utils/jesFtp', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    retrieveMember: vi.fn(),
    pollJobStatus: vi.fn(),
    listDatasets: vi.fn(),
    submitJob: vi.fn(),
    deleteJob: vi.fn(),
    retrieveJob: vi.fn(),
  },
  pollJobStatus: vi.fn(),
  listDatasets: vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Minimal nodes — only the fields DatasetTree reads (name, attributes.dsname,
// children). Cast since the full column-attribute set is irrelevant here.
const HELLO_MEMBER = {
  name: 'HELLO',
  attributes: { dsname: 'IBMUSER.JCL' },
} as Member;
const GOODBYE_MEMBER = {
  name: 'GOODBYE',
  attributes: { dsname: 'IBMUSER.JCL' },
} as Member;

const sampleDatasets = [
  {
    name: 'IBMUSER.JCL',
    attributes: { dsname: 'IBMUSER.JCL' },
    children: [HELLO_MEMBER, GOODBYE_MEMBER],
  },
  {
    name: 'IBMUSER.DATA',
    attributes: { dsname: 'IBMUSER.DATA' },
    children: [],
  },
] as unknown as Dataset[];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Click the tree-node row containing the given label text. */
function clickNode(labelText: string) {
  fireEvent.click(screen.getByText(labelText).closest('.tree-node')!);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DatasetTree', () => {
  it('renders dataset names', () => {
    render(<DatasetTree datasets={sampleDatasets} onSelectMember={vi.fn()} />);
    expect(screen.getByText('IBMUSER.JCL')).toBeInTheDocument();
    expect(screen.getByText('IBMUSER.DATA')).toBeInTheDocument();
  });

  it('hides member names by default (all datasets collapsed)', () => {
    render(<DatasetTree datasets={sampleDatasets} onSelectMember={vi.fn()} />);
    expect(screen.queryByText('HELLO')).not.toBeInTheDocument();
    expect(screen.queryByText('GOODBYE')).not.toBeInTheDocument();
  });

  it('shows a collapsed-arrow ▸ on datasets by default', () => {
    render(<DatasetTree datasets={sampleDatasets} onSelectMember={vi.fn()} />);
    const toggles = document.querySelectorAll('.tree-toggle');
    expect(toggles).toHaveLength(2);
    toggles.forEach((t) => expect(t.textContent).toBe('▸'));
  });

  it('expands a dataset and reveals its members when clicked', () => {
    render(<DatasetTree datasets={sampleDatasets} onSelectMember={vi.fn()} />);
    clickNode('IBMUSER.JCL');
    expect(screen.getByText('HELLO')).toBeInTheDocument();
    expect(screen.getByText('GOODBYE')).toBeInTheDocument();
    // The toggle arrow should have flipped to ▾
    expect(
      screen
        .getByText('IBMUSER.JCL')
        .closest('.tree-node')!
        .querySelector('.tree-toggle')!.textContent
    ).toBe('▾');
  });

  it('collapses a dataset when clicked a second time', () => {
    render(<DatasetTree datasets={sampleDatasets} onSelectMember={vi.fn()} />);
    clickNode('IBMUSER.JCL');
    clickNode('IBMUSER.JCL');
    expect(screen.queryByText('HELLO')).not.toBeInTheDocument();
  });

  it('does not expand other datasets when one is toggled', () => {
    render(<DatasetTree datasets={sampleDatasets} onSelectMember={vi.fn()} />);
    clickNode('IBMUSER.JCL');
    // IBMUSER.DATA has no members but its toggle should still be ▸
    const dataNode = screen.getByText('IBMUSER.DATA').closest('.tree-node');
    expect(dataNode!.querySelector('.tree-toggle')!.textContent).toBe('▸');
  });

  it('calls onSelectMember with the clicked member object', () => {
    const onSelectMember = vi.fn();
    render(
      <DatasetTree datasets={sampleDatasets} onSelectMember={onSelectMember} />
    );
    clickNode('IBMUSER.JCL');
    clickNode('HELLO');
    expect(onSelectMember).toHaveBeenCalledOnce();
    expect(onSelectMember).toHaveBeenCalledWith(HELLO_MEMBER);
  });

  it('renders an empty tree when datasets is []', () => {
    const { container } = render(
      <DatasetTree datasets={[]} onSelectMember={vi.fn()} />
    );
    expect(container.querySelector('.tree')).not.toBeNull();
    expect(container.querySelectorAll('li')).toHaveLength(0);
  });
});
