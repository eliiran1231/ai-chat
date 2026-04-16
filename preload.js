const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  invoke(channel, payload) {
    return ipcRenderer.invoke(channel, payload);
  },
  onFullscreenChanged(callback) {
    const listener = (_event, isFullscreen) => {
      callback(isFullscreen);
    };

    ipcRenderer.on('window:fullscreen-changed', listener);

    return () => {
      ipcRenderer.removeListener('window:fullscreen-changed', listener);
    };
  },
});
