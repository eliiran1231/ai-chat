const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke(channel, payload) {
    return ipcRenderer.invoke(channel, payload);
  },
});
