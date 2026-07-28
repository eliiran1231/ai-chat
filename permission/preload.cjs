const { contextBridge, ipcRenderer } = require('electron');

const CHANNEL = 'system-permission:decision';

contextBridge.exposeInMainWorld('permission', Object.freeze({
  approve() {
    ipcRenderer.send(CHANNEL, 'approve');
  },
  deny() {
    ipcRenderer.send(CHANNEL, 'deny');
  },
}));

