// Lightweight AceEditor stand-in for jsdom tests.
// The real editor uses Web Workers, canvas, and ContentEditable APIs that
// are unavailable in jsdom.  This shim renders a plain <textarea> so tests
// can assert on content without importing any of the ace-builds machinery.
import { createElement } from 'react';

// Only the props the tests read are typed; the real AceEditor accepts many
// more (mode, theme, width, …) which callers pass and this shim ignores.
interface AceEditorProps {
  value?: string;
  name?: string;
}

export default function AceEditor({ value, name }: AceEditorProps) {
  return createElement('textarea', {
    'data-testid': `ace-editor-${name ?? ''}`,
    readOnly: true,
    value: value ?? '',
    onChange: () => {}, // silence React controlled-input warning
  });
}
