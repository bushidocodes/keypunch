import { SET_EXPLORER_CONTENT } from '../constants';
import type { ExplorerAction } from '../actions/explorer';

export interface ExplorerState {
  explorerContent: string;
}

const initialExplorerState: ExplorerState = {
  explorerContent: '',
};

export default function explorer(
  state: ExplorerState = initialExplorerState,
  action: ExplorerAction
): ExplorerState {
  const newState = { ...state };

  switch (action.type) {
    case SET_EXPLORER_CONTENT:
      newState.explorerContent = action.explorerContent;
      break;
    default:
      return state;
  }
  return newState;
}
