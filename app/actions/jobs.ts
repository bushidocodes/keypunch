import { REFRESH_JOBS, LOAD_JOB_RESULTS } from '../constants';
import type { JobMap } from '../utils/jesParse';

export const refreshJobs = (jobsState: JobMap) => ({
  type: REFRESH_JOBS,
  jobsState,
});

export const loadJobResults = (jobID: string, results: string) => ({
  type: LOAD_JOB_RESULTS,
  jobID,
  results,
});

export type JobsAction =
  | ReturnType<typeof refreshJobs>
  | ReturnType<typeof loadJobResults>;
