// Thin renderer-side JES client.
//
// All FTP/JES I/O now runs in the MAIN process behind `window.keypunch.jes.*`
// (see electron/main.js + electron/preload.js). This module keeps the SAME
// public surface and the SAME redux dispatch points as the old renderer-side
// implementation, but instead of opening sockets itself it:
//   1. dispatches the connecting/submitting/retrieving flags,
//   2. calls the corresponding preload method (which does the full FTP chain
//      in main and returns RAW results, or throws),
//   3. parses the raw results with the existing jesParse.ts,
//   4. dispatches the refresh/load actions.
//
// Parsing stays here in the renderer so the harness unit tests for jesParse
// remain valid.

import { store } from '../index';
import {
  setIsConnected,
  setIsConnecting,
  setIsSubmitted,
  setIsSubmitting,
  setIsRetrieved,
  setIsRetrieving,
  setIsDisconnected,
  setIsDisconnecting
} from '../actions/results';
import { refreshJobs, loadJobResults } from '../actions/jobs';
import { setExplorerContent } from '../actions/explorer';
import { refreshDatasets } from '../actions/datasets';
import { parseJobs, parseDatasets, parseMembers } from './jesParse';

// Pull the FTP config out of redux. This is exactly the shape main expects.
function getConfig() {
  const { config } = store.getState();
  return {
    hostName: config.hostName,
    ftpPort: config.ftpPort,
    ftpUserName: config.ftpUserName,
    ftpPassword: config.ftpPassword
  };
}

function bridge() {
  return window.keypunch.jes;
}

class JES {
  constructor() {
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.pollJobStatus = this.pollJobStatus.bind(this);
    this.submitJob = this.submitJob.bind(this);
    this.deleteJob = this.deleteJob.bind(this);
    this.retrieveJob = this.retrieveJob.bind(this);
    this.listDatasets = this.listDatasets.bind(this);
    this.retrieveMember = this.retrieveMember.bind(this);
    this._errorLookup = this._errorLookup.bind(this);
  }

  // Connect if not already connected.
  async connect() {
    store.dispatch(setIsConnecting(true));
    store.dispatch(setIsConnected(false));
    try {
      await bridge().connect(getConfig());
      store.dispatch(setIsConnecting(false));
      store.dispatch(setIsConnected(true));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async disconnect() {
    store.dispatch(setIsDisconnecting(true));
    try {
      await bridge().disconnect();
    } catch (err) {
      this._errorLookup(err);
    }
    // Clear all indicators (mirrors the original behaviour).
    store.dispatch(setIsConnected(false));
    store.dispatch(setIsConnecting(false));
    store.dispatch(setIsSubmitted(false));
    store.dispatch(setIsSubmitting(false));
    store.dispatch(setIsRetrieved(false));
    store.dispatch(setIsRetrieving(false));
    store.dispatch(setIsDisconnected(false));
    store.dispatch(setIsDisconnecting(false));
  }

  async pollJobStatus() {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    store.dispatch(setIsConnecting(true));
    try {
      const rows = await bridge().pollJobs(getConfig());
      store.dispatch(setIsConnecting(false));
      store.dispatch(setIsConnected(true));
      // parseJobs throws on an unreadable queue and returns {} for the known
      // empty-queue informational message; both paths dispatch refreshJobs.
      const jobs = parseJobs(rows);
      store.dispatch(refreshJobs(jobs));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async submitJob(content) {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      await bridge().submitJob(getConfig(), content);
      store.dispatch(setIsConnected(true));
      store.dispatch(setIsSubmitted(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async deleteJob(jobID) {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      await bridge().deleteJob(getConfig(), jobID);
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async retrieveJob(jobID) {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      const output = await bridge().retrieveJob(getConfig(), jobID);
      store.dispatch(loadJobResults(jobID, output));
      store.dispatch(setIsRetrieved(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async listDatasets() {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    store.dispatch(setIsConnecting(true));
    try {
      const config = getConfig();
      const rows = await bridge().listDatasets(config);
      store.dispatch(setIsConnecting(false));
      store.dispatch(setIsConnected(true));
      // parseDatasets throws on an unreadable listing and drops the header row.
      const datasets = parseDatasets(rows);
      // Populate the members of each dataset, exactly as the old flow did.
      for (const dataset of datasets) {
        const dsname = dataset.attributes.dsname;
        try {
          const memberRows = await bridge().listMembers(config, dsname);
          const members = parseMembers(memberRows, dsname);
          dataset.children.push(...members);
        } catch (err) {
          // An empty / unreadable PDS just yields no members.
          console.log(err);
        }
      }
      store.dispatch(refreshDatasets(datasets));
      store.dispatch(setIsRetrieved(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async retrieveMember(datasetName, memberName) {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      const content = await bridge().retrieveMember(getConfig(), datasetName, memberName);
      store.dispatch(setExplorerContent(content));
      store.dispatch(setIsRetrieved(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  _errorLookup(err) {
    store.dispatch(setIsSubmitting(false));
    store.dispatch(setIsRetrieving(false));
    store.dispatch(setIsConnecting(false));
    console.log('JES error:', err && err.message ? err.message : err);
  }
}

const jes = new JES();
export default jes;

// react-router `onEnter` handlers in routes.js import these as named exports.
// They were broken in the original (imported but never exported); now they are
// real, bound functions.
export const pollJobStatus = jes.pollJobStatus;
export const listDatasets = jes.listDatasets;
