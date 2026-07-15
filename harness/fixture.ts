// Deterministic seed data for the mock z/OS FTP/JES server.
//
// `makeFixture()` returns a fresh, independent copy every call so the server's
// `reseed()` can reset to a known baseline before each test/run. The row
// strings below are exactly what the server emits over a `LIST`, shaped to
// match what `app/utils/jesParse.ts` parses (space-delimited columns; dataset
// and member listings carry a header row that the parser discards; the JES job
// queue has no header).

// The mutable in-memory state the mock server keeps for a run. Everything is a
// plain string or string map because it mirrors the raw text the real
// mainframe streams back over FTP.
export interface Fixture {
  /** Owner stamped onto jobs created by a SUBMIT (STOR) in JES mode. */
  submitOwner: string;
  /** Next submitted job number; JOB00100, then JOB00101, … (reset on reseed). */
  jobCounter: number;
  /** JES held queue, keyed by job ID → the raw LIST row for that job. */
  jobs: Record<string, string>;
  /** Spool output returned by `RETR <jobID>.x`, keyed by job ID. */
  jobOutputs: Record<string, string>;
  /** Header row the SEQ dataset listing emits (dropped by the parser). */
  datasetHeader: string;
  /** Raw dataset LIST rows (one per dataset). */
  datasets: string[];
  /** Header row the member listing emits (dropped by the parser). */
  memberHeader: string;
  /** Member LIST rows per dataset name. */
  members: Record<string, string[]>;
  /** Member content returned by `RETR <member>`, keyed by dataset then member. */
  memberContents: Record<string, Record<string, string>>;
}

export function makeFixture(): Fixture {
  return {
    // Owner stamped onto jobs created by a SUBMIT (STOR) in JES mode.
    submitOwner: 'IBMUSER',
    // Next submitted job is JOB00100, then JOB00101, ... (reset on reseed).
    jobCounter: 100,

    // --- JES held queue (FILETYPE=JES, no header row) -------------------
    // `<owner> <jobID> <status> [<n> Spool Files]`
    jobs: {
      JOB00045: 'IBMUSER JOB00045 OUTPUT 3 Spool Files',
      JOB00046: 'IBMUSER JOB00046 ACTIVE',
    },
    // Spool output returned by RETR <jobID>.x
    jobOutputs: {
      JOB00045:
        '1                J E S 2  J O B  L O G\n HELLO WORLD FROM JES\n IEF142I JOB00045 - COND CODE 0000\n',
    },

    // --- Sequential / PDS datasets (FILETYPE=SEQ, header dropped) -------
    // columns: volume unit referred ext used recfm lrecl blksz dsorg dsname
    datasetHeader:
      'Volume Unit    Referred  Ext Used Recfm Lrecl BlkSz Dsorg Dsname',
    datasets: [
      'VPWRKA 3390   2017/01/01 1   15   FB    80    27920 PO    IBMUSER.SOURCE',
      'VPWRKB 3390   2017/01/02 1   5    FB    80    27920 PS    IBMUSER.JCL',
    ],

    // --- Members per dataset (header dropped) ---------------------------
    // columns: name vvmm created changed size init mod id
    memberHeader: ' Name     VV.MM  Created    Changed    Size  Init  Mod  Id',
    members: {
      'IBMUSER.SOURCE': [
        'HELLO    01.01  2017/01/01 2017/01/02 20    20    0    IBMUSER',
        'COBOL1   01.00  2017/01/01 2017/01/01 50    50    0    IBMUSER',
      ],
      'IBMUSER.JCL': [],
    },
    // Member content returned by RETR <member> after CWD into the dataset.
    memberContents: {
      'IBMUSER.SOURCE': {
        HELLO:
          'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\n    DISPLAY "HELLO WORLD".\n    STOP RUN.\n',
      },
    },
  };
}
