// Keypunch preload.
//
// The ONLY bridge between the locked-down renderer and the main process. It
// exposes a small, explicit `window.keypunch` API via contextBridge; the
// renderer has no direct access to Node, `fs`, `promise-ftp`, `dialog`, or
// `ipcRenderer`. Every method here is a thin wrapper over an ipcMain.handle
// channel in main.ts.

import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { KeypunchApi, MenuChannel } from '../app/keypunch';

const api: KeypunchApi = {
  // --- file dialogs + fs (run in main) ---
  // Returns { path, content } or null if the user cancelled.
  openFile: () => ipcRenderer.invoke('file:open'),
  // Returns the saved path or null. Shows a Save dialog unless (overwrite && path).
  saveFile: (content, path, overwrite) =>
    ipcRenderer.invoke('file:save', content, path, overwrite),
  // Returns true if the user confirmed the submit message box.
  confirmSubmit: () => ipcRenderer.invoke('dialog:confirmSubmit'),
  // Generic yes/no confirm; returns true when the second (action) button is chosen.
  confirm: (opts) => ipcRenderer.invoke('dialog:confirm', opts),

  // --- JES / FTP (all I/O runs in main; raw results come back to be parsed
  //     by the renderer's jesParse.ts) ---
  jes: {
    setCredentials: (username, password) =>
      ipcRenderer.invoke('jes:setCredentials', username, password),
    connect: (config) => ipcRenderer.invoke('jes:connect', config),
    disconnect: () => ipcRenderer.invoke('jes:disconnect'),
    pollJobs: (config) => ipcRenderer.invoke('jes:pollJobs', config),
    submitJob: (config, content) => ipcRenderer.invoke('jes:submitJob', config, content),
    retrieveJob: (config, jobID) => ipcRenderer.invoke('jes:retrieveJob', config, jobID),
    deleteJob: (config, jobID) => ipcRenderer.invoke('jes:deleteJob', config, jobID),
    listDatasets: (config) => ipcRenderer.invoke('jes:listDatasets', config),
    listMembers: (config, dsname) => ipcRenderer.invoke('jes:listMembers', config, dsname),
    retrieveMember: (config, dsname, member) =>
      ipcRenderer.invoke('jes:retrieveMember', config, dsname, member),
    listDatasetsWithMembers: (config) =>
      ipcRenderer.invoke('jes:listDatasetsWithMembers', config)
  },

  // --- main -> renderer menu events ---
  // channel is one of: file:new, file:open, file:save, file:saveAs, kill-ftp
  onMenu: (cb) => {
    const listener = (_evt: IpcRendererEvent, channel: MenuChannel) => cb(channel);
    ipcRenderer.on('menu', listener);
    return () => ipcRenderer.removeListener('menu', listener);
  }
};

contextBridge.exposeInMainWorld('keypunch', api);
