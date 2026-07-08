import { ipcMain, webContents } from 'electron';
import { dbService } from '../services/db.service.js';
import { SYNC_CHANNELS } from '../shared/ipc/sync-channels.js';

export function registerSyncHandlers(): void {
  ipcMain.handle(SYNC_CHANNELS.getStatus, () => dbService.getSyncState());
  dbService.subscribeToSyncState((state) => {
    for (const contents of webContents.getAllWebContents()) {
      contents.send(SYNC_CHANNELS.statusChanged, state);
    }
  });
}
