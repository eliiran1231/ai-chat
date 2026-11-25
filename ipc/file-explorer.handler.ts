import { app, ipcMain, type IpcMainInvokeEvent } from 'electron';
import * as path from 'node:path';
import {
  FILE_CHANNELS,
  type DeleteFileRequest,
  type SaveChatFileRequest,
} from '../shared/files/ChatFile.js';
import { FileExplorerService } from '../services/file-explorer.service.js';
import { authenticationService } from '../services/server-authentication.service.js';
import { messageService } from '../services/message.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

export function registerFileExplorerHandlers(
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean,
): void {
  const files = new FileExplorerService(() => path.join(app.getPath('userData'), 'attachments'));

  function owner(event: IpcMainInvokeEvent): string {
    if (!isTrustedSender(event)) throw new Error('Untrusted attachment request.');
    // The renderer supplies a chat ID, never a filesystem path or a user ID.
    return authenticationService.getCurrentUser()?.id ?? 'local';
  }

  ipcMain.handle(
    'ownerId',
    withIpcErrorHandling((event, request) => owner(event)),
  );

  ipcMain.handle(
    'rootPath',
    withIpcErrorHandling((event, request) => path.resolve(app.getPath('userData'))),
  );

  ipcMain.handle(
    FILE_CHANNELS.save,
    withIpcErrorHandling((event, request: SaveChatFileRequest) => files.saveFile(request)),
  );

  ipcMain.handle(
    FILE_CHANNELS.delete,
    withIpcErrorHandling((event, request: string) => files.deleteFile(request)),
  );

  ipcMain.handle(
    FILE_CHANNELS.list,
    withIpcErrorHandling((event, request: string) => files.listFiles(request)),
  );
}
