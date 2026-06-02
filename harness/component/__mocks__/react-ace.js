// Lightweight AceEditor stand-in for jsdom tests.
// The real editor uses Web Workers, canvas, and ContentEditable APIs that
// are unavailable in jsdom.  This shim renders a plain <textarea> so tests
// can assert on content without importing any of the ace-builds machinery.
import { createElement } from 'react';

export default function AceEditor({ value, name }) {
  return createElement('textarea', {
    'data-testid': `ace-editor-${name ?? ''}`,
    readOnly: true,
    value: value ?? '',
    onChange: () => {}, // silence React controlled-input warning
  });
}
