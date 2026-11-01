const { contextBridge, ipcRenderer } = require('electron');

// The only things the page may ask the desktop app to do.
contextBridge.exposeInMainWorld('bsNative', {
  save: (o) => ipcRenderer.invoke('bs:save', o),                  // {path,name,text,saveAs} -> {path,name} | {canceled} | {error}
  open: (p) => ipcRenderer.invoke('bs:open', p || null),          // -> {path,name,text} | {canceled} | {error}
  autosave: (fmt, data) => ipcRenderer.invoke('bs:autosave', fmt, data),
  autosaveList: () => ipcRenderer.invoke('bs:autosave-list'),
  autosaveClear: (fmt) => ipcRenderer.invoke('bs:autosave-clear', fmt || null),
  confirm: (o) => ipcRenderer.invoke('bs:confirm', o),            // -> index of the button pressed
  message: (o) => ipcRenderer.invoke('bs:message', o),
  setState: (s) => ipcRenderer.send('bs:state', s),               // {dirty,title,names}
  closeNow: () => ipcRenderer.send('bs:close-now'),
  closeAck: () => ipcRenderer.send('bs:close-ack'),
  closeCancel: () => ipcRenderer.send('bs:close-cancel'),
  discardAndClose: () => ipcRenderer.send('bs:discard-close'),
  pdf: (o) => ipcRenderer.invoke('bs:pdf', o),                    // {html,name,preview} -> {path,name} | {canceled} | {error}
  openGuide: () => ipcRenderer.invoke('bs:guide'),                 // -> {ok} | {error}
  takePendingOpen: () => ipcRenderer.invoke('bs:pending-open'),   // file double-clicked in Windows
  onMenu: (cb) => ipcRenderer.on('bs:menu', (_e, cmd, arg) => cb(cmd, arg)),
  onSaveAllAndClose: (cb) => ipcRenderer.on('bs:save-all-close', () => cb()),
  onCloseRequest: (cb) => ipcRenderer.on('bs:close-request', () => cb())
});
