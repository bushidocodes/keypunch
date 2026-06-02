import { SET_EXPLORER_CONTENT } from '../constants';

export const setExplorerContent = (explorerContent: string) => ({
  type: SET_EXPLORER_CONTENT,
  explorerContent,
});

export type ExplorerAction = ReturnType<typeof setExplorerContent>;
