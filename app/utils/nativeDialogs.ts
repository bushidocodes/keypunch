// File-system / dialog helpers. All actual fs + dialog work now happens in the
// MAIN process behind `window.keypunch.openFile` / `window.keypunch.saveFile`;
// this module just calls those and dispatches the results into redux.

import { setEditorContent, setEditorPath } from '../actions/editor';
import { store } from '../index';
import jes from './jesFtp';

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
  const currentPath = store.getState().editor.editorPath;
  const editorContent = store.getState().editor.editorContent;
  const savedPath = await window.keypunch.saveFile(
    editorContent,
    currentPath,
    overwrite
  );
  if (savedPath) {
    store.dispatch(setEditorPath(savedPath));
  }
}

export async function testConnectivity(): Promise<void> {
  await jes.connect();
  if (!store.getState().results.isConnected) return;
  await new Promise<void>((r) => window.setTimeout(r, 1500));
  await jes.disconnect();
}
