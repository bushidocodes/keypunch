import { SET_THEME_DARK, SET_THEME_LIGHT, SET_COLOR } from '../constants';

export const setThemeDark  = ()              => ({ type: SET_THEME_DARK });
export const setThemeLight = ()              => ({ type: SET_THEME_LIGHT });
export const setColor      = (color: string) => ({ type: SET_COLOR, color });

export type UiStyleAction =
  | ReturnType<typeof setThemeDark>
  | ReturnType<typeof setThemeLight>
  | ReturnType<typeof setColor>;
