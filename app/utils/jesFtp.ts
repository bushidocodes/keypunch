// Thin renderer-side JES client.
//
// All FTP/JES I/O now runs in the MAIN process behind `window.keypunch.jes.*`
// (see electron/main.ts + electron/preload.ts). This module keeps the SAME
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

import { refreshDatasets } from '../actions/datasets';
import { setExplorerContent } from '../actions/explorer';
import { loadJobResults, refreshJobs } from '../actions/jobs';
import {
  setErrorMessage,
  setIsConnected,
  setIsConnecting,
  setIsDisconnected,
  setIsDisconnecting,
  setIsRetrieved,
  setIsRetrieving,
  setIsSubmitted,
  setIsSubmitting,
} from '../actions/results';
import { store } from '../index';
import type { FtpConfig } from '../keypunch';
import { parseDatasets, parseJobs, parseMembers } from './jesParse';

// Pull the FTP config out of Redux. Password is intentionally excluded —
// it is stored in the main process via jes:setCredentials and must not be
// re-transmitted on every IPC call.
function getConfig(): FtpConfig {
  const { config } = store.getState();
  return {
    hostName: config.hostName,
    ftpPort: config.ftpPort,
    ftpUserName: config.ftpUserName,
    ftpsEnabled: config.ftpsEnabled,
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
  async connect(): Promise<void> {
    store.dispatch(setIsConnecting(true));
    store.dispatch(setIsConnected(false));
    try {
      await bridge().connect(getConfig());
      store.dispatch(setIsConnecting(false));
      store.dispatch(setIsConnected(true));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async disconnect(): Promise<void> {
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

  async pollJobStatus(): Promise<void> {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    store.dispatch(setIsConnecting(true));
    try {
      const rows = await bridge().pollJobs(getConfig());
      store.dispatch(setIsConnecting(false));
      store.dispatch(setIsConnected(true));
      // parseJobs throws on an unreadable queue and returns {} for the known
      // empty-queue informational message; both paths dispatch refreshJobs.
      const parsedJobs = parseJobs(rows);
      store.dispatch(refreshJobs(parsedJobs));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async submitJob(content: string): Promise<void> {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      await bridge().submitJob(getConfig(), content);
      store.dispatch(setIsConnected(true));
      store.dispatch(setIsSubmitted(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async deleteJob(jobID: string): Promise<void> {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      await bridge().deleteJob(getConfig(), jobID);
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async retrieveJob(jobID: string): Promise<void> {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      const output = await bridge().retrieveJob(getConfig(), jobID);
      store.dispatch(loadJobResults(jobID, output));
      store.dispatch(setIsRetrieved(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async listDatasets(): Promise<void> {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    store.dispatch(setIsConnecting(true));
    try {
      // Use the compound call so the full dataset + member listing is a single
      // atomic operation in the main-process FTP queue.  A concurrent
      // pollJobStatus can no longer interleave its FTP commands between the
      // individual member-listing calls (fixes issue #2).
      const { datasetRows, memberRowsByDs } =
        await bridge().listDatasetsWithMembers(getConfig());
      store.dispatch(setIsConnecting(false));
      store.dispatch(setIsConnected(true));
      // parseDatasets throws on an unreadable listing and drops the header row.
      const datasets = parseDatasets(datasetRows);
      for (const dataset of datasets) {
        const dsname = dataset.attributes.dsname;
        const memberRows = memberRowsByDs[dsname] ?? [];
        dataset.children.push(...parseMembers(memberRows, dsname));
      }
      store.dispatch(refreshDatasets(datasets));
      store.dispatch(setIsRetrieved(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  async retrieveMember(datasetName: string, memberName: string): Promise<void> {
    store.dispatch(setIsSubmitting(true));
    store.dispatch(setIsRetrieving(true));
    try {
      const content = await bridge().retrieveMember(
        getConfig(),
        datasetName,
        memberName
      );
      store.dispatch(setExplorerContent(content));
      store.dispatch(setIsRetrieved(true));
      store.dispatch(setIsSubmitting(false));
      store.dispatch(setIsRetrieving(false));
      store.dispatch(setErrorMessage(''));
    } catch (err) {
      this._errorLookup(err);
    }
  }

  _errorLookup(err: unknown): void {
    store.dispatch(setIsSubmitting(false));
    store.dispatch(setIsRetrieving(false));
    store.dispatch(setIsConnecting(false));
    const message = err instanceof Error ? err.message : String(err);
    store.dispatch(setErrorMessage(`JES error: ${message}`));
  }
}

const jes = new JES();
export default jes;

// react-router `onEnter` handlers exported as named exports so routes and
// components can import them directly.
export const pollJobStatus = jes.pollJobStatus;
export const listDatasets = jes.listDatasets;
