// File-system / dialog helpers. All actual fs + dialog work now happens in the
// MAIN process behind `window.keypunch.openFile` / `window.keypunch.saveFile`;
// this module just calls those and dispatches the results into redux.

import { setEditorContent, setEditorPath } from '../actions/editor';
import {
  setIsConnected,
  setIsConnecting,
  setIsSubmitted,
  setIsSubmitting,
  setIsRetrieved,
  setIsRetrieving,
  setIsDisconnected,
  setIsDisconnecting,
} from '../actions/results';
import { store } from '../index';

export async function openFilePicker(): Promise<void> {
  const result = await window.keypunch.openFile();
  if (result) {
    store.dispatch(setEditorContent(result.content));
    store.dispatch(setEditorPath(result.path));
  }
}

export function newFile(): void {
  store.dispatch(setEditorContent(''));
  store.dispatch(setEditorPath(''));
}

export async function saveFile(overwrite = false): Promise<void> {
  const currentPath   = store.getState().editor.editorPath;
  const editorContent = store.getState().editor.editorContent;
  const savedPath = await window.keypunch.saveFile(editorContent, currentPath, overwrite);
  if (savedPath) {
    store.dispatch(setEditorPath(savedPath));
  }
}

export function testIndicators(): void {
  const tests = [
    () => setIsConnecting(true),
    () => setIsConnecting(false),
    () => setIsSubmitting(true),
    () => setIsSubmitting(false),
    () => setIsRetrieving(true),
    () => setIsRetrieving(false),
    () => setIsDisconnecting(true),
    () => setIsDisconnecting(false),
    () => setIsConnected(true),
    () => setIsSubmitted(true),
    () => setIsRetrieved(true),
    () => setIsDisconnected(true),
    () => setIsConnected(false),
    () => setIsSubmitted(false),
    () => setIsRetrieved(false),
    () => setIsDisconnected(false),
  ];
  tests.forEach((test, index) => {
    window.setTimeout(() => { store.dispatch(test()); }, 2000 * index);
  });
}
