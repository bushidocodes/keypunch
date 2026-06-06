import merge from 'lodash/merge';
import { REFRESH_JOBS, LOAD_JOB_RESULTS } from '../constants';
import type { Job, JobMap } from '../utils/jesParse';
import type { JobsAction } from '../actions/jobs';

// State is a hashmap keyed by job ID. Each value is a Job record enriched with
// an optional `results` field that holds the downloaded spool output.
export type JobEntry = Job & { results?: string };
export type JobsState = Record<string, JobEntry>;

const initialJobsState: JobsState = {};

export default function jobs(
  state: JobsState = initialJobsState,
  action: JobsAction
): JobsState {
  switch (action.type) {
    case REFRESH_JOBS: {
      // Merge incoming jobs into existing state so previously-downloaded results
      // are preserved. The original code mutated in place; _.merge does the same
      // but without the side-effect on the original state object.
      return merge({} as JobsState, state, action.jobsState as JobMap);
    }
    case LOAD_JOB_RESULTS: {
      const updated = { ...state };
      if (updated[action.jobID]) {
        updated[action.jobID] = { ...updated[action.jobID], results: action.results };
      }
      return updated;
    }
    default:
      return state;
  }
}
