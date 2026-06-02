// Keypunch main process.
//
// Owns everything that needs Node: the BrowserWindow, the native application
// menu, all filesystem access (open/save dialogs + fs), and all FTP/JES traffic
// to the mainframe (via `promise-ftp`). The renderer is locked down
// (contextIsolation:true, nodeIntegration:false) and reaches main only through
// the `window.keypunch` API defined in preload.js over IPC.

import { app, BrowserWindow, Menu, shell, dialog, ipcMain } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import PromiseFtp from 'promise-ftp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;

// --------------------------------------------------------------------------
// JES — all FTP/JES I/O. Each high-level op runs the FULL command chain the
// renderer used to run inline, and returns RAW results (LIST -> string[],
// RETR -> string) or throws. Parsing stays in the renderer (jesParse.js) so
// the harness unit/integration tests remain valid.
// --------------------------------------------------------------------------
class JES {
  constructor() {
    this.ftp = new PromiseFtp();
  }

  async connect(config) {
    if (this.ftp.getConnectionStatus() === 'connected') {
      return 'Already connected';
    }
    await this.ftp.connect({
      host: config.hostName,
      port: config.ftpPort,
      user: config.ftpUserName,
      password: config.ftpPassword
    });
    return 'connected';
  }

  async disconnect() {
    let status = this.ftp.getConnectionStatus();
    if (status === 'not yet connected' || status === 'disconnected') {
      return 'disconnected';
    }
    try {
      await this.ftp.end();
    } catch (_) {
      // fall through to a forced destroy below
    }
    status = this.ftp.getConnectionStatus();
    let numTries = 10;
    while (status === 'disconnecting' && numTries > 0) {
      await this._sleep(2000);
      status = this.ftp.getConnectionStatus();
      numTries--;
    }
    if (status === 'disconnecting' || status === 'connected') {
      try { this.ftp.destroy(); } catch (_) {}
    }
    // promise-ftp cannot be reused after end()/destroy(); make a fresh client
    // so a later connect() works.
    this.ftp = new PromiseFtp();
    return 'disconnected';
  }

  async setEncoding(type) {
    if (type === 'ascii') {
      return this.ftp.ascii();
    }
  }

  async setFiletype(filetype) {
    if (filetype === 'jes' || filetype === 'seq') {
      return this.ftp.site('FILETYPE=' + filetype);
    }
  }

  // Returns the raw LIST lines for the JES held queue.
  async pollJobs(config) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('jes');
    return this.ftp.list('');
  }

  // STOR a job. `contentString` is the editor contents.
  async submitJob(config, contentString) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('jes');
    await this.ftp.put(Buffer.from(contentString), '/');
    return 'submitted';
  }

  // Retrieve a job's spool output (RETR <jobID>.x) as a string.
  async retrieveJob(config, jobID) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('jes');
    const stream = await this.ftp.get(jobID + '.x');
    return this._streamToString(stream);
  }

  async deleteJob(config, jobID) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('jes');
    await this.ftp.delete(jobID);
    return 'deleted';
  }

  // Returns raw LIST lines for the datasets at the home qualifier.
  async listDatasets(config) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('seq');
    return this.ftp.list('');
  }

  // Returns raw LIST lines for the members of `dsname`.
  async listMembers(config, dsname) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('seq');
    try {
      await this.ftp.cwd(dsname);
      const rows = await this.ftp.list('');
      return rows;
    } catch (err) {
      // "No Members Found" / empty PDS — mirror the old behaviour of treating
      // this as an empty member list rather than an error.
      return [];
    } finally {
      // MVS treats the home directory as the high-level-qualifier (the userid).
      try { await this.ftp.cwd('~'); } catch (_) {}
    }
  }

  // Retrieve the contents of a member as a string.
  async retrieveMember(config, dsname, member) {
    await this.connect(config);
    await this.setEncoding('ascii');
    await this.setFiletype('seq');
    try {
      await this.ftp.cwd('~');
      await this.ftp.cwd(dsname);
      const stream = await this.ftp.get(member);
      return await this._streamToString(stream);
    } finally {
      try { await this.ftp.cwd('~'); } catch (_) {}
    }
  }

  // --- private helpers ----------------------------------------------------

  _streamToString(stream) {
    return new Promise((resolve, reject) => {
      let data = '';
      stream.on('data', (chunk) => { data += chunk.toString(); });
      stream.on('end', () => resolve(data));
      stream.on('error', reject);
      // CRITICAL: node-ftp hands back a PAUSED data socket. On modern Node,
      // attaching a 'data' listener to an explicitly-paused stream does NOT
      // auto-resume it, so without this call the stream never flows and the
      // transfer hangs forever. This is the latent bug from issue #16.
      stream.resume();
    });
  }

  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const jes = new JES();

// --------------------------------------------------------------------------
// IPC handlers
// --------------------------------------------------------------------------
function registerIpc() {
  // --- file dialogs + fs ---
  ipcMain.handle('file:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'createDirectory', 'showHiddenFiles']
    });
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    const content = await readFile(filePath, 'utf8');
    return { path: filePath, content };
  });

  ipcMain.handle('file:save', async (_evt, content, currentPath, overwrite) => {
    if (overwrite && currentPath) {
      await writeFile(currentPath, content);
      return currentPath;
    }
    const result = await dialog.showSaveDialog(mainWindow, {});
    if (result.canceled || !result.filePath) return null;
    await writeFile(result.filePath, content);
    return result.filePath;
  });

  ipcMain.handle('dialog:confirmSubmit', async () => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Cancel', 'Submit'],
      defaultId: 0,
      title: 'Confirm Job Submission',
      message: 'Are you sure that you want to submit your batch job?',
      noLink: true
    });
    return result.response === 1;
  });

  ipcMain.handle('dialog:confirm', async (_evt, opts) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: opts.buttons || ['Cancel', 'OK'],
      defaultId: 0,
      title: opts.title || 'Confirm',
      message: opts.message || '',
      noLink: true
    });
    return result.response === 1;
  });

  // --- JES / FTP ---
  ipcMain.handle('jes:connect', (_evt, config) => jes.connect(config));
  ipcMain.handle('jes:disconnect', () => jes.disconnect());
  ipcMain.handle('jes:pollJobs', (_evt, config) => jes.pollJobs(config));
  ipcMain.handle('jes:submitJob', (_evt, config, content) => jes.submitJob(config, content));
  ipcMain.handle('jes:retrieveJob', (_evt, config, jobID) => jes.retrieveJob(config, jobID));
  ipcMain.handle('jes:deleteJob', (_evt, config, jobID) => jes.deleteJob(config, jobID));
  ipcMain.handle('jes:listDatasets', (_evt, config) => jes.listDatasets(config));
  ipcMain.handle('jes:listMembers', (_evt, config, dsname) => jes.listMembers(config, dsname));
  ipcMain.handle('jes:retrieveMember', (_evt, config, dsname, member) =>
    jes.retrieveMember(config, dsname, member));
}

// --------------------------------------------------------------------------
// Native application menu. Menu clicks that drive editor actions send IPC to
// the renderer ('menu' channel); the Kill FTP item calls main directly.
// --------------------------------------------------------------------------
function sendMenu(channel) {
  if (mainWindow) mainWindow.webContents.send('menu', channel);
}

function buildMenu() {
  const template = [
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
          click: () => shell.openExternal('https://github.com/bushidocodes/keypunch-old')
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
    template[1].submenu.push(
      { type: 'separator' },
      {
        label: 'Speech',
        submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
      }
    );
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// --------------------------------------------------------------------------
// Window / app lifecycle
// --------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Keypunch',
    show: false,
    width: 1024,
    height: 728,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
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
    mainWindow.show();
    mainWindow.focus();
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
