import { combineReducers } from '@reduxjs/toolkit';
import editor from './editor';
import explorer from './explorer';
import config from './config';
import results from './results';
import uiStyle from './uiStyle';
import jobs from './jobs';
import datasets from './datasets';

const rootReducer = combineReducers({
  editor,
  config,
  results,
  uiStyle,
  jobs,
  datasets,
  explorer
});

export default rootReducer;
