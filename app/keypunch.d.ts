// Shared IPC contract between the locked-down renderer and the main process.
//
// `window.keypunch` (set up in electron/preload.ts via contextBridge) is the
// ONLY surface the renderer can use to reach main. main.ts implements the
// matching ipcMain.handle channels; preload.ts implements this interface; the
// renderer consumes `window.keypunch`. Keeping the shape here means all three
// are type-checked against a single source of truth.

// The FTP/JES connection config. Pulled out of redux in the renderer
// (app/utils/jesFtp.js getConfig) and consumed by main's JES methods. Ports
// come from a text input, hence string.
export interface FtpConfig {
  hostName: string;
  ftpPort: string;
  ftpUserName: string;
  ftpPassword: string;
}

// Options for the generic yes/no confirm dialog.
export interface ConfirmOptions {
  buttons?: string[];
  title?: string;
  message?: string;
}

// Result of an open-file dialog: the chosen path + its contents, or null when
// the user cancelled.
export interface OpenFileResult {
  path: string;
  content: string;
}

// Menu channels forwarded from main to the renderer over the 'menu' channel.
export type MenuChannel =
  | 'file:new'
  | 'file:open'
  | 'file:save'
  | 'file:saveAs'
  | 'kill-ftp';

// The JES/FTP slice of the API. Each call does the FULL FTP command chain in
// main and returns RAW results (LIST -> string[], RETR -> string) or rejects;
// parsing happens in the renderer (app/utils/jesParse.ts).
export interface KeypunchJesApi {
  connect(config: FtpConfig): Promise<string>;
  disconnect(): Promise<string>;
  pollJobs(config: FtpConfig): Promise<string[]>;
  submitJob(config: FtpConfig, content: string): Promise<string>;
  retrieveJob(config: FtpConfig, jobID: string): Promise<string>;
  deleteJob(config: FtpConfig, jobID: string): Promise<string>;
  listDatasets(config: FtpConfig): Promise<string[]>;
  listMembers(config: FtpConfig, dsname: string): Promise<string[]>;
  retrieveMember(config: FtpConfig, dsname: string, member: string): Promise<string>;
}

// The full `window.keypunch` surface.
export interface KeypunchApi {
  // Returns { path, content } or null if the user cancelled.
  openFile(): Promise<OpenFileResult | null>;
  // Returns the saved path or null. Shows a Save dialog unless (overwrite && path).
  saveFile(content: string, path: string | null, overwrite: boolean): Promise<string | null>;
  // Returns true if the user confirmed the submit message box.
  confirmSubmit(): Promise<boolean>;
  // Generic yes/no confirm; resolves true when the action button is chosen.
  confirm(opts: ConfirmOptions): Promise<boolean>;
  jes: KeypunchJesApi;
  // Subscribe to main->renderer menu events. Returns an unsubscribe function.
  onMenu(cb: (channel: MenuChannel) => void): () => void;
}

declare global {
  interface Window {
    keypunch: KeypunchApi;
  }
}

export {};
