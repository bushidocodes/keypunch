import { REFRESH_DATASETS } from '../constants';
import type { Dataset } from '../utils/jesParse';

export const refreshDatasets = (datasets: Dataset[]) => ({
  type: REFRESH_DATASETS,
  datasets,
});

export type DatasetsAction = ReturnType<typeof refreshDatasets>;
