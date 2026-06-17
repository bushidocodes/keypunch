// Keypunch main process.
//
// Owns everything that needs Node: the BrowserWindow, the native application
// menu, all filesystem access (open/save dialogs + fs), and all FTP/JES traffic
// to the mainframe (via `basic-ftp`). The renderer is locked down
// (contextIsolation:true, nodeIntegration:false) and reaches main only through
// the `window.keypunch` API defined in preload.ts over IPC.

import {
  app,
  BrowserWindow,
  Menu,
  shell,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type MenuItemConstructorOptions
} from 'electron';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, type FileInfo } from 'basic-ftp';
import { Writable, PassThrough } from 'stream';
import type {
  FtpConfig,
  ConfirmOptions,
  OpenFileResult,
  MenuChannel
} from '../app/keypunch';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

// --------------------------------------------------------------------------
// JES — all FTP/JES I/O. Each high-level op runs the FULL command chain the
// renderer used to run inline, and returns RAW results (LIST -> string[],
// RETR -> string) or throws. Parsing stays in the renderer (jesParse.ts) so
// the harness unit/integration tests remain valid.
//
// All public methods are called through the serial IPC queue (see
// registerIpc below), so only one FTP operation runs at a time and their
// commands can never interleave on the shared Client connection.
// Internal helpers (_ensureConnected, _setEncoding, _setFiletype) are
// private and must NOT be wrapped in the queue themselves — they are only
// called from within already-queued operations.
// --------------------------------------------------------------------------
class JES {
  private ftp: Client;
  // Credentials are stored here after the renderer calls jes:setCredentials.
  // They are intentionally NOT carried in FtpConfig (the per-call IPC payload)
  // so the password is not re-transmitted on every pollJobs / listDatasets call.
  private _username = '';
  private _password = '';

  constructor() {
    this.ftp = new Client();
  }

  // -----------------------------------------------------------------------
  // Private helpers — called only from within queued public methods.
  // -----------------------------------------------------------------------

  private async _ensureConnected(config: FtpConfig): Promise<void> {
    if (!this.ftp.closed) return;
    await this.ftp.access({
      host:     config.hostName,
      port:     Number(config.ftpPort),
      user:     this._username,
      password: this._password,
      // `true` → explicit FTPS (AUTH TLS): the control connection is
      // established in plaintext and then upgraded with AUTH TLS.
      // `false` → plain FTP (default; required for z/OS servers without TLS).
      secure: config.ftpsEnabled,
    });
  }

  private async _setEncoding(type: string): Promise<void> {
    if (type === 'ascii') await this.ftp.send('TYPE A');
  }

  private async _setFiletype(filetype: string): Promise<void> {
    if (filetype === 'jes' || filetype === 'seq') {
      await this.ftp.send('SITE FILETYPE=' + filetype.toUpperCase());
    }
  }

  // basic-ftp parses LIST into FileInfo objects, but the renderer parsers
  // (jesParse.ts) expect raw z/OS MVS listing strings.  Override parseList
  // temporarily so list() collects the raw text instead of parsing it.
  private async _rawList(): Promise<string[]> {
    let rawLines: string[] = [];
    const saved = this.ftp.parseList;
    this.ftp.parseList = (raw: string): FileInfo[] => {
      rawLines = raw.split(/\r?\n/).filter(Boolean);
      return [];
    };
    try {
      await this.ftp.list();
    } finally {
      this.ftp.parseList = saved;
    }
    return rawLines;
  }

  // Download a remote file into memory as a UTF-8 string.
  private async _downloadToString(remotePath: string): Promise<string> {
    const chunks: Buffer[] = [];
    const dest = new Writable({
      write(chunk: Buffer, _enc: string, cb: () => void) { chunks.push(chunk); cb(); }
    });
    await this.ftp.downloadTo(dest, remotePath);
    return Buffer.concat(chunks).toString();
  }

  // -----------------------------------------------------------------------
  // Public methods — each runs one atomic sequence of FTP commands.
  // Called through the serial queue in registerIpc(); never call these
  // from within another public method (use the private helpers instead).
  // -----------------------------------------------------------------------

  // Store credentials. Called by the renderer whenever the username or
  // password field changes; must be called before the first FTP operation.
  setCredentials(username: string, password: string): void {
    this._username = username;
    this._password = password;
  }

  async connect(config: FtpConfig): Promise<string> {
    await this._ensureConnected(config);
    return 'connected';
  }

  async disconnect(): Promise<string> {
    if (this.ftp.closed) return 'disconnected';
    // close() tears down the socket; Client cannot be reused after that,
    // so we always recreate — mirrors the old promise-ftp destroy() pattern.
    this.ftp.close();
    this.ftp = new Client();
    return 'disconnected';
  }

  // Returns the raw LIST lines for the JES held queue.
  async pollJobs(config: FtpConfig): Promise<string[]> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('jes');
    return this._rawList();
  }

  // STOR a job. `contentString` is the editor contents.
  async submitJob(config: FtpConfig, contentString: string): Promise<string> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('jes');
    const src = new PassThrough();
    src.end(Buffer.from(contentString));
    await this.ftp.uploadFrom(src, '/');
    return 'submitted';
  }

  // Retrieve a job's spool output (RETR <jobID>.x) as a string.
  async retrieveJob(config: FtpConfig, jobID: string): Promise<string> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('jes');
    return this._downloadToString(jobID + '.x');
  }

  async deleteJob(config: FtpConfig, jobID: string): Promise<string> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('jes');
    await this.ftp.remove(jobID);
    return 'deleted';
  }

  // Returns raw LIST lines for the datasets at the home qualifier.
  async listDatasets(config: FtpConfig): Promise<string[]> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('seq');
    return this._rawList();
  }

  // Returns raw LIST lines for the members of `dsname`.
  async listMembers(config: FtpConfig, dsname: string): Promise<string[]> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('seq');
    try {
      await this.ftp.cd(dsname);
      return await this._rawList();
    } catch {
      // "No Members Found" / empty PDS — mirror the old behaviour of treating
      // this as an empty member list rather than an error.
      return [];
    } finally {
      // MVS treats the home directory as the high-level-qualifier (the userid).
      try { await this.ftp.cd('~'); } catch { /* best-effort reset */ }
    }
  }

  // Retrieve the contents of a member as a string.
  async retrieveMember(config: FtpConfig, dsname: string, member: string): Promise<string> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('seq');
    try {
      await this.ftp.cd('~');
      await this.ftp.cd(dsname);
      return await this._downloadToString(member);
    } finally {
      try { await this.ftp.cd('~'); } catch { /* best-effort */ }
    }
  }

  // Atomic compound operation: list all datasets AND all their members in a
  // single queued call.  Keeping this in one IPC round-trip prevents a
  // concurrent pollJobStatus from slipping its FTP commands between the
  // individual listMembers calls that the renderer used to make in a loop.
  //
  // Returns the raw rows so parsing (parseDatasets / parseMembers) stays in
  // the renderer alongside the existing jesParse unit tests.
  async listDatasetsWithMembers(config: FtpConfig): Promise<{
    datasetRows: string[];
    memberRowsByDs: Record<string, string[]>;
  }> {
    await this._ensureConnected(config);
    await this._setEncoding('ascii');
    await this._setFiletype('seq');

    const datasetRows = await this._rawList();

    // Extract the dsname from each row (10th space-separated column, matching
    // the parseDatasets column order in jesParse.ts). Slice off the header row.
    const dsnames = datasetRows
      .slice(1)
      .map(row => row.trim().split(/\s+/)[9] ?? '')
      .filter(Boolean);

    const memberRowsByDs: Record<string, string[]> = {};
    for (const dsname of dsnames) {
      try {
        await this.ftp.cd(dsname);
        memberRowsByDs[dsname] = await this._rawList();
      } catch {
        // Empty / unreadable PDS — treat as no members (mirrors listMembers).
        memberRowsByDs[dsname] = [];
      } finally {
        try { await this.ftp.cd('~'); } catch { /* best-effort reset */ }
      }
    }

    return { datasetRows, memberRowsByDs };
  }
}

const jes = new JES();

// --------------------------------------------------------------------------
// IPC handlers
// --------------------------------------------------------------------------
function registerIpc(): void {
  // Serial queue — ensures only one FTP operation runs at a time.
  // Concurrent IPC calls queue behind the current operation instead of
  // interleaving their commands on the shared PromiseFtp connection.
  // Each fn runs after the previous one completes (or fails — errors in one
  // operation do not block the queue from draining).
  let _ftpQueue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    // Absorb the ticket's own rejection on _ftpQueue so the chain stays live.
    const ticket = _ftpQueue.then(fn, fn);
    _ftpQueue = ticket.then(() => {}, () => {});
    return ticket;
  }

  // --- file dialogs + fs ---
  ipcMain.handle('file:open', async (): Promise<OpenFileResult | null> => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile', 'createDirectory', 'showHiddenFiles']
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0]!; // length checked above
    const content = await readFile(filePath, 'utf8');
    return { path: filePath, content };
  });

  ipcMain.handle(
    'file:save',
    async (
      _evt: IpcMainInvokeEvent,
      content: string,
      currentPath: string | null,
      overwrite: boolean
    ): Promise<string | null> => {
      if (overwrite && currentPath) {
        await writeFile(currentPath, content);
        return currentPath;
      }
      const result = await dialog.showSaveDialog(mainWindow!, {});
      if (result.canceled || !result.filePath) return null;
      await writeFile(result.filePath, content);
      return result.filePath;
    }
  );

  ipcMain.handle('dialog:confirmSubmit', async (): Promise<boolean> => {
    const result = await dialog.showMessageBox(mainWindow!, {
      type: 'question',
      buttons: ['Cancel', 'Submit'],
      defaultId: 0,
      title: 'Confirm Job Submission',
      message: 'Are you sure that you want to submit your batch job?',
      noLink: true
    });
    return result.response === 1;
  });

  ipcMain.handle(
    'dialog:confirm',
    async (_evt: IpcMainInvokeEvent, opts: ConfirmOptions): Promise<boolean> => {
      const result = await dialog.showMessageBox(mainWindow!, {
        type: 'question',
        buttons: opts.buttons || ['Cancel', 'OK'],
        defaultId: 0,
        title: opts.title || 'Confirm',
        message: opts.message || '',
        noLink: true
      });
      return result.response === 1;
    }
  );

  // --- JES / FTP — all wrapped through the serial queue ---

  // setCredentials is synchronous on the main side and does not touch the FTP
  // connection, so it runs outside the queue.  This also avoids a deadlock if
  // the renderer calls setCredentials while another operation is queued.
  ipcMain.handle('jes:setCredentials',
    (_evt: IpcMainInvokeEvent, username: string, password: string) =>
      jes.setCredentials(username, password));

  ipcMain.handle('jes:connect',
    (_evt: IpcMainInvokeEvent, config: FtpConfig) =>
      enqueue(() => jes.connect(config)));

  ipcMain.handle('jes:disconnect',
    () => enqueue(() => jes.disconnect()));

  ipcMain.handle('jes:pollJobs',
    (_evt: IpcMainInvokeEvent, config: FtpConfig) =>
      enqueue(() => jes.pollJobs(config)));

  ipcMain.handle('jes:submitJob',
    (_evt: IpcMainInvokeEvent, config: FtpConfig, content: string) =>
      enqueue(() => jes.submitJob(config, content)));

  ipcMain.handle('jes:retrieveJob',
    (_evt: IpcMainInvokeEvent, config: FtpConfig, jobID: string) =>
      enqueue(() => jes.retrieveJob(config, jobID)));

  ipcMain.handle('jes:deleteJob',
    (_evt: IpcMainInvokeEvent, config: FtpConfig, jobID: string) =>
      enqueue(() => jes.deleteJob(config, jobID)));

  ipcMain.handle('jes:listDatasets',
    (_evt: IpcMainInvokeEvent, config: FtpConfig) =>
      enqueue(() => jes.listDatasets(config)));

  ipcMain.handle('jes:listMembers',
    (_evt: IpcMainInvokeEvent, config: FtpConfig, dsname: string) =>
      enqueue(() => jes.listMembers(config, dsname)));

  ipcMain.handle('jes:retrieveMember',
    (_evt: IpcMainInvokeEvent, config: FtpConfig, dsname: string, member: string) =>
      enqueue(() => jes.retrieveMember(config, dsname, member)));

  ipcMain.handle('jes:listDatasetsWithMembers',
    (_evt: IpcMainInvokeEvent, config: FtpConfig) =>
      enqueue(() => jes.listDatasetsWithMembers(config)));
}

// --------------------------------------------------------------------------
// Native application menu. Menu clicks that drive editor actions send IPC to
// the renderer ('menu' channel); the Kill FTP item calls main directly.
// --------------------------------------------------------------------------
function sendMenu(channel: MenuChannel): void {
  if (mainWindow) mainWindow.webContents.send('menu', channel);
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New File', accelerator: 'CmdOrCtrl+N', click: () => sendMenu('file:new') },
        { type: 'separator' },
        { label: 'Open File', accelerator: 'CmdOrCtrl+O', click: () => sendMenu('file:open') },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenu('file:save') },
        { label: 'Save As', accelerator: 'Shift+CmdOrCtrl+S', click: () => sendMenu('file:saveAs') },
        { type: 'separator' },
        { role: 'minimize' },
        { label: 'Close Window', role: 'close', accelerator: 'Shift+CmdOrCtrl+W' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'View on GitHub',
          click: () => shell.openExternal('https://github.com/bushidocodes/keypunch')
        },
        {
          // The renderer's 'kill-ftp' handler calls window.keypunch.jes.disconnect()
          // (-> jes.disconnect() here) and clears the status indicators, so we just
          // forward the event rather than disconnecting twice.
          label: 'Kill FTP',
          click: () => sendMenu('kill-ftp')
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services', submenu: [] },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
    // Add the macOS Speech submenu to the Edit menu. Find it by label rather
    // than index: the unshift above shifted every position, and the previous
    // hardcoded index (template[1]) pointed Speech at the File menu by mistake.
    const editMenu = template.find((item) => item.label === 'Edit');
    if (editMenu) {
      (editMenu.submenu as MenuItemConstructorOptions[]).push(
        { type: 'separator' },
        {
          label: 'Speech',
          submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
        }
      );
    }
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --------------------------------------------------------------------------
// Window / app lifecycle
// --------------------------------------------------------------------------
function createWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'Keypunch',
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  // electron-vite injects ELECTRON_RENDERER_URL in dev; in production load the
  // built renderer HTML.
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow!.show();
    mainWindow!.focus();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.whenReady().then(() => {
  registerIpc();
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
