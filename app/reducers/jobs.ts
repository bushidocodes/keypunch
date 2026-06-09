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
      // Replace the jobs state with the incoming snapshot so stale jobs
      // (deleted on the server) are removed, while preserving any downloaded
      // results for jobs that are still present in the queue.
      const incoming = action.jobsState as JobMap;
      const next: JobsState = {};
      for (const [id, job] of Object.entries(incoming)) {
        const existingResults = state[id]?.results;
        next[id] = existingResults !== undefined
          ? { ...(job as Job), results: existingResults }
          : { ...(job as Job) };
      }
      return next;
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
