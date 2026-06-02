import { SET_EDITOR_CONTENT, SET_EDITOR_PATH } from '../constants';
import type { EditorAction } from '../actions/editor';

export interface EditorState {
  editorContent: string;
  editorPath: string;
}

const initialEditorState: EditorState = {
  editorContent: '',
  editorPath: '',
};

export default function editor(
  state: EditorState = initialEditorState,
  action: EditorAction
): EditorState {
  const newState = { ...state };

  switch (action.type) {
    case SET_EDITOR_CONTENT:
      newState.editorContent = action.editorContent;
      break;
    case SET_EDITOR_PATH:
      newState.editorPath = action.editorPath;
      break;
    default:
      return state;
  }
  return newState;
}
