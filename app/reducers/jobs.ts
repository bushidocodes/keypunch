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
      // Replace the jobs state with the incoming snapshot. Using merge kept
      // stale keys for jobs that were deleted on the server; a direct replace
      // ensures the UI reflects the real queue state.
      return { ...(action.jobsState as JobMap) } as JobsState;
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
