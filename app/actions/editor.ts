import { SET_EDITOR_CONTENT, SET_EDITOR_PATH } from '../constants';

export const setEditorContent = (editorContent: string) => ({
  type: SET_EDITOR_CONTENT,
  editorContent,
});

export const setEditorPath = (editorPath: string) => ({
  type: SET_EDITOR_PATH,
  editorPath,
});

export type EditorAction =
  | ReturnType<typeof setEditorContent>
  | ReturnType<typeof setEditorPath>;
