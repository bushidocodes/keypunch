import { useEffect, useState } from 'react';
import AceEditor from '../utils/react-ace';
import 'ace-builds/src-noconflict/mode-cobol';
import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-twilight';
import { connect } from 'react-redux';
import jes, { pollJobStatus } from '../utils/jesFtp';
import type { RootState } from '../reducers';
import type { JobEntry } from '../reducers/jobs';

function mapStateToProps(state: RootState) {
  return {
    jobs:        state.jobs,
    theme:       state.uiStyle.theme,
    isConnected: state.results.isConnected,
  };
}

function mapDispatchToProps() {
  return {
    deleteJob: async (jobID: string) => {
      const confirmed = await window.keypunch.confirm({
        buttons: ['Cancel', 'Delete'],
        title: 'Confirm deletion',
        message: `Are you sure that you want to delete ${jobID} from the mainframes job entry subsystem?. This is irreversible.`,
      });
      if (confirmed) {
        jes.deleteJob(jobID);
      }
    },
    retrieveJob: async (jobID: string) => {
      const confirmed = await window.keypunch.confirm({
        buttons: ['Cancel', 'Download'],
        title: 'Confirm download',
        message: `Are you sure that you want to download ${jobID}.`,
      });
      if (confirmed) {
        jes.retrieveJob(jobID);
      }
    },
  };
}

type Props = ReturnType<typeof mapStateToProps> & ReturnType<typeof mapDispatchToProps>;

// Plain two-pane list + detail layout (replaces react-desktop's
// MasterDetailsView, whose React-15 reconciliation threw error #120 when the
// job list grew). The left pane lists the JES queue; selecting a job shows its
// properties (or downloaded output) in the right pane.
function Results(props: Props) {
  // Old react-router v3 `onEnter={pollJobStatus}` -> run once on mount.
  useEffect(() => {
    pollJobStatus();
  }, []);

  const jobIDs = Object.keys(props.jobs);
  const [selectedJobID, setSelectedJobID] = useState<string | null>(null);

  // Resolve the currently-shown job: the selection if it still exists,
  // otherwise the first job in the queue.
  const activeJobID: string | null =
    selectedJobID && props.jobs[selectedJobID]
      ? selectedJobID
      : (jobIDs[0] ?? null);

  if (jobIDs.length === 0) {
    return (
      <div className="results">
        {props.isConnected
          ? <p className="results-empty">Connected, but the Mainframe queue is empty</p>
          : <p className="results-empty">Connect and Refresh to see results!</p>}
      </div>
    );
  }

  const activeJob: JobEntry | null = activeJobID ? (props.jobs[activeJobID] ?? null) : null;

  return (
    <div className="results">
      <ul className="results-list">
        {jobIDs.map((jobID) => (
          <li
            key={jobID}
            className={
              jobID === activeJobID
                ? 'results-list-item results-list-item-active'
                : 'results-list-item'
            }
            onClick={() => setSelectedJobID(jobID)}
          >
            {jobID}
          </li>
        ))}
      </ul>
      <div className="results-detail">
        {activeJob && activeJob.results ? (
          <AceEditor
            mode="cobol"
            theme={props.theme === 'dark' ? 'twilight' : 'github'}
            name="RESULTS" // TODO: Change this to a generated value when we add multiple editors
            value={activeJob.results}
            readOnly
            editorProps={{ readOnly: true }}
            width="100%"
            height="100%"
            fontSize={20}
          />
        ) : activeJob ? (
          <div className="results-properties">
            <p>Job ID: {activeJob.jobID}</p>
            <p>Owner: {activeJob.owner}</p>
            <p>Status: {activeJob.status}</p>
            <p># Files: {activeJob.numberOfSpoolFiles}</p>
            <button
              className="results-btn results-btn-delete"
              onClick={() => props.deleteJob(activeJobID!)}
            >
              Delete
            </button>
            {activeJob.numberOfSpoolFiles && Number(activeJob.numberOfSpoolFiles) > 0 ? (
              <button
                className="results-btn results-btn-download"
                onClick={() => props.retrieveJob(activeJobID!)}
              >
                Download
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(Results);
