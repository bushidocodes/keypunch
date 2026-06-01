// Deterministic seed data for the mock z/OS FTP/JES server.
//
// `makeFixture()` returns a fresh, independent copy every call so the server's
// `reseed()` can reset to a known baseline before each test/run. The row
// strings below are exactly what the server emits over a `LIST`, shaped to
// match what `app/utils/jesParse.js` parses (space-delimited columns; dataset
// and member listings carry a header row that the parser discards; the JES job
// queue has no header).

export function makeFixture() {
  return {
    // Owner stamped onto jobs created by a SUBMIT (STOR) in JES mode.
    submitOwner: 'IBMUSER',
    // Next submitted job is JOB00100, then JOB00101, ... (reset on reseed).
    jobCounter: 100,

    // --- JES held queue (FILETYPE=JES, no header row) -------------------
    // `<owner> <jobID> <status> [<n> Spool Files]`
    jobs: {
      JOB00045: 'IBMUSER JOB00045 OUTPUT 3 Spool Files',
      JOB00046: 'IBMUSER JOB00046 ACTIVE'
    },
    // Spool output returned by RETR <jobID>.x
    jobOutputs: {
      JOB00045: '1                J E S 2  J O B  L O G\n HELLO WORLD FROM JES\n IEF142I JOB00045 - COND CODE 0000\n'
    },

    // --- Sequential / PDS datasets (FILETYPE=SEQ, header dropped) -------
    // columns: volume unit referred ext used recfm lrecl blksz dsorg dsname
    datasetHeader: 'Volume Unit    Referred  Ext Used Recfm Lrecl BlkSz Dsorg Dsname',
    datasets: [
      'VPWRKA 3390   2017/01/01 1   15   FB    80    27920 PO    IBMUSER.SOURCE',
      'VPWRKB 3390   2017/01/02 1   5    FB    80    27920 PS    IBMUSER.JCL'
    ],

    // --- Members per dataset (header dropped) ---------------------------
    // columns: name vvmm created changed size init mod id
    memberHeader: ' Name     VV.MM  Created    Changed    Size  Init  Mod  Id',
    members: {
      'IBMUSER.SOURCE': [
        'HELLO    01.01  2017/01/01 2017/01/02 20    20    0    IBMUSER',
        'COBOL1   01.00  2017/01/01 2017/01/01 50    50    0    IBMUSER'
      ],
      'IBMUSER.JCL': []
    },
    // Member content returned by RETR <member> after CWD into the dataset.
    memberContents: {
      'IBMUSER.SOURCE': {
        HELLO: 'IDENTIFICATION DIVISION.\nPROGRAM-ID. HELLO.\nPROCEDURE DIVISION.\n    DISPLAY "HELLO WORLD".\n    STOP RUN.\n'
      }
    }
  };
}
