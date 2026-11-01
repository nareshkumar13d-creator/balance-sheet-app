const { app, BrowserWindow, Menu, shell, dialog, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const pkg = require('./package.json');

// electron-updater is optional at run time (e.g. "run_without_installing" before npm install)
let autoUpdater = null;
try { ({ autoUpdater } = require('electron-updater')); } catch (e) { autoUpdater = null; }

const PRODUCT = (pkg.build && pkg.build.productName) || pkg.productName || 'Balance Sheet';
const COPYRIGHT = (pkg.build && pkg.build.copyright) || '';
const FMTS = ['v', 'h', 'a'];
const guidePath = () => (app.isPackaged ? path.join(process.resourcesPath, 'User_Guide.pdf') : path.join(__dirname, 'docs', 'User_Guide.pdf'));
let win = null;
let manualCheck = false;   // true only when the user clicked "Check for updates"
let downloading = false;
let state = { dirty: false, names: [] };   // reported by the page: unsaved work?
let forceClose = false;
let pendingOpen = null;    // .bsdata file double-clicked in Windows
let closeAsked = false;    // the page is showing its "unsaved changes" box
let closeWait = null;      // fallback timer if the page does not answer

/* ---------------- small file helpers ---------------- */
const userDir = () => app.getPath('userData');
const autoDir = () => path.join(userDir(), 'autosave');
const recentFile = () => path.join(userDir(), 'recent.json');
const okExt = (p) => /\.(bsdata|json)$/i.test(String(p || ''));
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
function writeAtomic(f, text) {                       // write to a temp file first, so a crash never leaves half a file
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = f + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, f);
}
function getRecent() {
  const r = readJson(recentFile(), []);
  return Array.isArray(r) ? r.filter((p) => typeof p === 'string' && fs.existsSync(p)).slice(0, 8) : [];
}
function addRecent(p) {
  const r = [p, ...getRecent().filter((x) => x.toLowerCase() !== p.toLowerCase())].slice(0, 8);
  try { writeAtomic(recentFile(), JSON.stringify(r)); } catch (e) { /* not important */ }
  Menu.setApplicationMenu(buildMenu());
}
function clearAutosave(fmt) {
  (fmt ? [fmt] : FMTS).forEach((f) => { try { fs.unlinkSync(path.join(autoDir(), f + '.json')); } catch (e) { /* none */ } });
}
const dataArg = (argv) => (argv || []).slice(1).find((a) => typeof a === 'string' && /\.bsdata$/i.test(a) && fs.existsSync(a));
const send = (cmd, arg) => { if (win && !win.isDestroyed()) win.webContents.send('bs:menu', cmd, arg); };

/* ---------------- window ---------------- */
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: PRODUCT,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, preload: path.join(__dirname, 'preload.js') }
  });
  Menu.setApplicationMenu(buildMenu());
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // never navigate away from the app; open any web link in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('page-title-updated', (e) => e.preventDefault());   // the page sets the title (file name + unsaved mark)

  win.on('close', (e) => {
    if (forceClose || !state.dirty) return;
    e.preventDefault();
    if (closeAsked) return;
    closeAsked = true;
    // the page shows its own "Save / Don't save / Cancel" box; if it does not answer in 2 s, use the system box
    closeWait = setTimeout(() => { closeWait = null; nativeClosePrompt(); }, 2000);
    win.webContents.send('bs:close-request');
  });
  win.on('closed', () => { win = null; });
}

function nativeClosePrompt() {
  closeAsked = false;
  if (!win || win.isDestroyed()) return;
  const r = dialog.showMessageBoxSync(win, {
    type: 'warning', title: 'Unsaved changes', message: 'You have unsaved changes.',
    detail: (state.names.length ? 'Format: ' + state.names.join(', ') + '\n\n' : '') + 'Do you want to save before closing?',
    buttons: ['Save', "Don't save", 'Cancel'], defaultId: 0, cancelId: 2, noLink: true
  });
  if (r === 0) win.webContents.send('bs:save-all-close');          // page saves, then asks us to close
  else if (r === 1) { clearAutosave(null); forceClose = true; win.close(); }
}

function buildMenu() {
  const recent = getRecent();
  const recentItems = recent.length
    ? recent.map((p) => ({ label: path.basename(p), sublabel: p, click: () => send('openpath', p) }))
    : [{ label: '(none)', enabled: false }];
  return Menu.buildFromTemplate([
    { label: 'File', submenu: [
      { label: 'Open...', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
      { label: 'Open Recent', submenu: recentItems },
      { type: 'separator' },
      { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
      { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => send('saveas') },
      { label: 'Start next year...', click: () => send('nextyear') },
      { type: 'separator' },
      { label: 'Export to Excel...', accelerator: 'CmdOrCtrl+E', click: () => send('xlsx') },
      { label: 'Export to PDF...', accelerator: 'CmdOrCtrl+Shift+E', click: () => send('pdf') },
      { label: 'Print preview', accelerator: 'CmdOrCtrl+P', click: () => send('preview') },
      { type: 'separator' },
      { role: 'quit', label: 'Exit' }
    ] },
    { label: 'Help', submenu: [
      { label: 'Quick help', accelerator: 'F1', click: () => send('help') },
      { label: 'Quick tour', click: () => send('tour') },
      { label: 'User Guide (PDF)', click: () => openGuide() },
      { type: 'separator' },
      { label: 'Check for updates...', click: () => checkForUpdates(true) },
      { type: 'separator' },
      { label: 'About ' + PRODUCT, click: showAbout }
    ] }
  ]);
}

async function openGuide() {
  const p = guidePath();
  if (!fs.existsSync(p)) return { error: 'The file User_Guide.pdf was not found next to the program.' };
  const m = await shell.openPath(p);
  return m ? { error: 'Could not open a PDF viewer: ' + m } : { ok: true };
}

function box(opts) {
  const o = Object.assign({ type: 'info', noLink: true }, opts);
  return win ? dialog.showMessageBox(win, o) : dialog.showMessageBox(o);
}

function showAbout() {
  box({
    title: 'About ' + PRODUCT,
    message: PRODUCT,
    detail: 'Version ' + app.getVersion() + '\n' + COPYRIGHT +
            '\n\nRuns fully offline. Your data stays on this computer.'
  });
}

/* ---------------- messages from the page ---------------- */
ipcMain.handle('bs:save', async (_e, o) => {
  try {
    o = o || {};
    let p = o.path;
    if (!p || o.saveAs) {
      const r = await dialog.showSaveDialog(win, {
        title: 'Save Balance Sheet data',
        defaultPath: p || path.join(app.getPath('documents'), String(o.name || 'Balance_Sheet_Data.bsdata')),
        filters: [{ name: 'Balance Sheet data (*.bsdata)', extensions: ['bsdata'] }, { name: 'JSON file (*.json)', extensions: ['json'] }]
      });
      if (r.canceled || !r.filePath) return { canceled: true };
      p = r.filePath;
      if (!okExt(p)) p += '.bsdata';
    }
    if (!okExt(p)) return { error: 'Only .bsdata or .json files can be saved here.' };
    if (typeof o.text !== 'string' || !o.text) return { error: 'Nothing to save.' };
    if (fs.existsSync(p)) { try { fs.copyFileSync(p, p + '.bak'); } catch (e) { /* backup is best effort */ } }   // previous version kept as .bak
    writeAtomic(p, o.text);
    addRecent(p);
    return { path: p, name: path.basename(p) };
  } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
});

ipcMain.handle('bs:open', async (_e, p) => {
  try {
    if (!p) {
      const r = await dialog.showOpenDialog(win, {
        title: 'Open Balance Sheet data', properties: ['openFile'],
        filters: [{ name: 'Balance Sheet data (*.bsdata, *.json)', extensions: ['bsdata', 'json'] }]
      });
      if (r.canceled || !r.filePaths.length) return { canceled: true };
      p = r.filePaths[0];
    } else if (!okExt(p)) return { error: 'Only .bsdata or .json files can be opened here.' };
    if (fs.statSync(p).size > 50 * 1024 * 1024) return { error: 'This file is too large to be a Balance Sheet data file.' };
    const text = fs.readFileSync(p, 'utf8');
    addRecent(p);
    return { path: p, name: path.basename(p), text };
  } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
});

ipcMain.handle('bs:autosave', (_e, fmt, d) => {
  try {
    if (!FMTS.includes(fmt) || !d || typeof d.json !== 'string') return false;
    writeAtomic(path.join(autoDir(), fmt + '.json'),
      JSON.stringify({ fmt, name: String(d.name || ''), path: d.path ? String(d.path) : null, savedAt: Date.now(), json: d.json }));
    return true;
  } catch (e) { return false; }
});
ipcMain.handle('bs:autosave-list', () => FMTS.map((f) => readJson(path.join(autoDir(), f + '.json'), null)).filter((x) => x && x.json));
ipcMain.handle('bs:autosave-clear', (_e, fmt) => { clearAutosave(FMTS.includes(fmt) ? fmt : null); return true; });
ipcMain.handle('bs:confirm', async (_e, o) => (await box(Object.assign({ type: 'question', buttons: ['OK'] }, o))).response);
ipcMain.handle('bs:message', async (_e, o) => { await box(o || {}); return true; });
ipcMain.handle('bs:guide', () => openGuide());
ipcMain.handle('bs:pending-open', () => { const p = pendingOpen; pendingOpen = null; return p; });
ipcMain.on('bs:state', (_e, s) => {
  s = s || {};
  state = { dirty: !!s.dirty, names: Array.isArray(s.names) ? s.names.slice(0, 5).map(String) : [] };
  if (win && !win.isDestroyed()) win.setTitle(String(s.title || 'Untitled') + ' - ' + PRODUCT);
});
ipcMain.on('bs:close-now', () => { forceClose = true; closeAsked = false; if (win && !win.isDestroyed()) win.close(); });

ipcMain.on('bs:close-ack', () => { if (closeWait) { clearTimeout(closeWait); closeWait = null; } });
ipcMain.on('bs:close-cancel', () => { closeAsked = false; if (closeWait) { clearTimeout(closeWait); closeWait = null; } });
ipcMain.on('bs:discard-close', () => { clearAutosave(null); forceClose = true; if (win && !win.isDestroyed()) win.close(); });

// PDF / print preview: the page sends the finished statements as plain HTML (always light colours);
// they are printed in a hidden window with scripts switched off.
ipcMain.handle('bs:pdf', async (_e, o) => {
  let tmpHtml = null, pw = null;
  try {
    if (!o || typeof o.html !== 'string' || !o.html) return { error: 'Nothing to print.' };
    const dir = path.join(userDir(), 'tmp');
    fs.mkdirSync(dir, { recursive: true });
    tmpHtml = path.join(dir, 'print-' + Date.now() + '.html');
    fs.writeFileSync(tmpHtml, o.html, 'utf8');
    pw = new BrowserWindow({ show: false, webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: false } });
    await pw.loadFile(tmpHtml);
    const buf = await pw.webContents.printToPDF({
      pageSize: 'A4', printBackground: true, displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;font-size:8px;text-align:center;color:#555"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      margins: { top: 0.5, bottom: 0.6, left: 0.5, right: 0.5 }
    });
    if (o.preview) {
      const p = path.join(dir, 'preview-' + Date.now() + '.pdf');
      fs.writeFileSync(p, buf);
      const m = await shell.openPath(p);
      return m ? { error: 'Could not open a PDF viewer: ' + m } : { path: p, name: path.basename(p), preview: true };
    }
    const r = await dialog.showSaveDialog(win, {
      title: 'Export PDF',
      defaultPath: path.join(app.getPath('documents'), String(o.name || 'Balance_Sheet.pdf')),
      filters: [{ name: 'PDF file (*.pdf)', extensions: ['pdf'] }]
    });
    if (r.canceled || !r.filePath) return { canceled: true };
    const p = /\.pdf$/i.test(r.filePath) ? r.filePath : r.filePath + '.pdf';
    fs.writeFileSync(p, buf);
    return { path: p, name: path.basename(p) };
  } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
  finally {
    try { if (pw && !pw.isDestroyed()) pw.destroy(); } catch (e) { /* ignore */ }
    try { if (tmpHtml) fs.unlinkSync(tmpHtml); } catch (e) { /* ignore */ }
  }
});
function cleanTmp() {                                   // remove old preview files (older than a day)
  try {
    const dir = path.join(userDir(), 'tmp');
    fs.readdirSync(dir).forEach((f) => { const p = path.join(dir, f); if (Date.now() - fs.statSync(p).mtimeMs > 864e5) fs.unlinkSync(p); });
  } catch (e) { /* none */ }
}

/* ---------------- updates ---------------- */
function setupUpdater() {
  if (!autoUpdater) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    manualCheck = false;
    box({
      title: 'Update available',
      message: 'Version ' + info.version + ' is available',
      detail: 'You are using version ' + app.getVersion() + '. Download the update now?\nYour saved data files are not affected.',
      buttons: ['Download now', 'Later'], defaultId: 0, cancelId: 1
    }).then((r) => {
      if (r.response === 0) { downloading = true; autoUpdater.downloadUpdate().catch(() => {}); }
    });
  });

  autoUpdater.on('update-not-available', () => {
    if (manualCheck) box({ title: 'No update', message: 'You are using the latest version (' + app.getVersion() + ').' });
    manualCheck = false;
  });

  autoUpdater.on('update-downloaded', (info) => {
    downloading = false;
    box({
      title: 'Update ready',
      message: 'Version ' + info.version + ' is ready to install',
      detail: 'Save your work first. The app will close and reopen after the update.',
      buttons: ['Restart and install', 'Later'], defaultId: 0, cancelId: 1
    }).then((r) => {
      if (r.response !== 0) return;
      if (state.dirty) {
        box({ type: 'warning', title: 'Save your work first', message: 'You have unsaved changes.',
              detail: 'Please save, then use Help > Check for updates. The update also installs when you next close the app.' });
        return;
      }
      forceClose = true;
      autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', () => {
    // offline use is normal, so stay silent unless the user asked for the check / download
    if (manualCheck || downloading) {
      box({ type: 'warning', title: 'Update', message: 'Could not check for updates.',
            detail: 'Please check your internet connection and try again later.' });
    }
    manualCheck = false; downloading = false;
  });
}

function checkForUpdates(manual) {
  manualCheck = !!manual;
  if (!autoUpdater || !app.isPackaged) {
    if (manual) box({ title: 'Updates', message: 'Updates are available only in the installed app.' });
    manualCheck = false;
    return;
  }
  autoUpdater.checkForUpdates().catch(() => {});
}

/* ---------------- start ---------------- */
const lock = app.requestSingleInstanceLock();
if (!lock) { app.quit(); }
else {
  pendingOpen = dataArg(process.argv);
  app.on('second-instance', (_e, argv) => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
    const p = dataArg(argv);
    if (p) send('openpath', p);
  });
  app.whenReady().then(() => {
    // the app never needs camera, location, notifications etc.
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(false));
    cleanTmp();
    createWindow();
    setupUpdater();
    setTimeout(() => checkForUpdates(false), 5000);   // quiet check a few seconds after start
  });
  app.on('window-all-closed', () => app.quit());
}
