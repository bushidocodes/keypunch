import { SET_THEME_DARK, SET_THEME_LIGHT, SET_COLOR } from '../constants';
import type { UiStyleAction } from '../actions/uiStyle';

export interface UiStyleState {
  theme: 'dark' | 'light';
  color: string;
}

const initialUiStyleState: UiStyleState = {
  theme: 'dark',
  color: 'cc7f29',
};

export default function uiStyle(
  state: UiStyleState = initialUiStyleState,
  action: UiStyleAction
): UiStyleState {
  const newState = { ...state };

  switch (action.type) {
    case SET_THEME_DARK:  newState.theme = 'dark';  break;
    case SET_THEME_LIGHT: newState.theme = 'light'; break;
    case SET_COLOR:       newState.color = action.color; break;
    default:
      return state;
  }
  return newState;
}
