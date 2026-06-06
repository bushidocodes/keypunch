import { SET_THEME_DARK, SET_THEME_LIGHT } from '../constants';

export const setThemeDark  = () => ({ type: SET_THEME_DARK });
export const setThemeLight = () => ({ type: SET_THEME_LIGHT });

export type UiStyleAction =
  | ReturnType<typeof setThemeDark>
  | ReturnType<typeof setThemeLight>;
