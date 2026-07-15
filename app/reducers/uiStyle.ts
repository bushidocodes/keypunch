import type { UiStyleAction } from '../actions/uiStyle';
import { SET_THEME_DARK, SET_THEME_LIGHT } from '../constants';

export interface UiStyleState {
  theme: 'dark' | 'light';
}

const initialUiStyleState: UiStyleState = {
  theme: 'dark',
};

export default function uiStyle(
  state: UiStyleState = initialUiStyleState,
  action: UiStyleAction
): UiStyleState {
  switch (action.type) {
    case SET_THEME_DARK:
      return { ...state, theme: 'dark' };
    case SET_THEME_LIGHT:
      return { ...state, theme: 'light' };
    default:
      return state;
  }
}
