import { REFRESH_DATASETS } from '../constants';
import type { Dataset } from '../utils/jesParse';
import type { DatasetsAction } from '../actions/datasets';

export type DatasetsState = Dataset[];

const initialDatasetsState: DatasetsState = [];

export default function datasets(
  state: DatasetsState = initialDatasetsState,
  action: DatasetsAction
): DatasetsState {
  switch (action.type) {
    case REFRESH_DATASETS:
      return action.datasets;
    default:
      return state;
  }
}
