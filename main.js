const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'Balance Sheet',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  // never navigate away from the app; open any web link in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
}

const lock = app.requestSingleInstanceLock();
if (!lock) { app.quit(); }
else {
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
