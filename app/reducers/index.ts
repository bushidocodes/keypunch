import { combineReducers } from '@reduxjs/toolkit';
import config from './config';
import datasets from './datasets';
import editor from './editor';
import explorer from './explorer';
import jobs from './jobs';
import results from './results';
import uiStyle from './uiStyle';

const rootReducer = combineReducers({
  editor,
  config,
  results,
  uiStyle,
  jobs,
  datasets,
  explorer,
});

export default rootReducer;

/** The shape of the entire Redux state tree. */
export type RootState = ReturnType<typeof rootReducer>;
