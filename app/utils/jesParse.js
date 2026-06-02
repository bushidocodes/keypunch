// Pure parsers for z/OS FTP (JES / MVS) `LIST` output.
//
// Extracted verbatim from the inline parsing that used to live inside the
// `JES` class methods in `jesFtp.js`, so the exact same column-splitting and
// edge-case handling can be unit-tested without an FTP connection or the Redux
// store. `jesFtp.js` now imports these so there is a single source of truth.
//
// The mainframe returns space-delimited rows; the first row of a dataset/member
// listing is a header that must be dropped. The JES job queue has no header but
// emits informational strings (e.g. an empty-queue message) that are not jobs.

// Informational string the mainframe returns when the held queue is empty.
export const NO_JOBS_MESSAGE = 'No jobs found on Held queue';

// Parse the output of `LIST ''` while in FILETYPE=JES mode into a map keyed by
// job ID. Throws when the queue could not be read at all (mirrors the original
// behaviour, which treated an empty array as an error). Returns {} for the
// known empty-queue informational message.
export function parseJobs(results) {
  if (!results || results.length === 0) {
    throw new Error('Unable to retrieve jobs from the mainframe JES Queue.');
  }
  if (results[0] === NO_JOBS_MESSAGE) {
    return {};
  }
  const jobs = {};
  results.forEach((job) => {
    const jobSplit = job.trim().split(/ +/);
    const jobID = jobSplit[1];
    jobs[jobID] = {
      owner: jobSplit[0],
      status: jobSplit[2],
      numberOfSpoolFiles: job.includes('Spool Files') ? jobSplit[3] : null,
      jobID,
      fullString: job.trim()
    };
  });
  return jobs;
}

// Parse the output of `LIST ''` while in FILETYPE=SEQ mode at the home
// qualifier into an array of dataset nodes (tree-ready for react-treebeard).
// The first row is a column header and is discarded. Throws when nothing came
// back at all (mirrors the original).
export function parseDatasets(results) {
  if (!results || results.length === 0) {
    throw new Error('Unable to list datasets.');
  }
  const rows = results.slice(1); // drop the header row
  return rows.map((dataset) => {
    const datasetSplit = dataset.trim().split(/ +/);
    const [volume, unit, referred, ext, used, recfm, lrecl, blksz, dsorg, dsname] = datasetSplit;
    return {
      name: dsname,
      toggled: false,
      children: [],
      attributes: { volume, unit, referred, ext, used, recfm, lrecl, blksz, dsorg, dsname }
    };
  });
}

// Parse the output of `LIST ''` inside a partitioned dataset into an array of
// member child-nodes belonging to `dsname`. The first row is a header and is
// discarded. Missing columns default to '' exactly as the original did.
export function parseMembers(results, dsname) {
  const rows = (results || []).slice(1); // drop the header row
  return rows.map((member) => {
    const memberSplit = member.trim().split(/ +/);
    const name = memberSplit[0] || '';
    const vvmm = memberSplit[1] || '';
    const created = memberSplit[2] || '';
    const changed = memberSplit[3] || '';
    const size = memberSplit[4] || '';
    const init = memberSplit[5] || '';
    const mod = memberSplit[6] || '';
    const id = memberSplit[7] || '';
    const dsorg = memberSplit[8] || '';
    return {
      name,
      attributes: { name, vvmm, created, changed, size, init, mod, id, dsorg, dsname }
    };
  });
}
