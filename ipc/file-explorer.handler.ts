import { app, ipcMain, type IpcMainInvokeEvent } from 'electron';
import * as path from 'node:path';
import { FILE_CHANNELS, type ChatFileRequest, type SaveChatFileRequest } from '../shared/files/ChatFile.js';
import { FileExplorerService } from '../services/file-explorer.service.js';
import { authenticationService } from '../services/server-authentication.service.js';
import { messageService } from '../services/message.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

export function registerFileExplorerHandlers(isTrustedSender: (event: IpcMainInvokeEvent) => boolean): void {
  const files = new FileExplorerService(() => path.join(app.getPath('userData'), 'attachments'));

  function owner(event: IpcMainInvokeEvent): string {
    if (!isTrustedSender(event)) throw new Error('Untrusted attachment request.');
    // The renderer supplies a chat ID, never a filesystem path or a user ID.
    return authenticationService.getCurrentUser()?.id ?? 'local';
  }

  ipcMain.handle(FILE_CHANNELS.save, withIpcErrorHandling((event, request: SaveChatFileRequest) =>
    files.saveFile(owner(event), request)));

  ipcMain.handle(FILE_CHANNELS.list, withIpcErrorHandling(async (event, request: { chatId: string }) => {
    const saved = await files.listFiles(owner(event), request?.chatId);
    const attachedIds = await messageService.getAttachmentFileIds(request.chatId);
    return saved.filter(file => attachedIds.has(file.id));
  }));

  ipcMain.handle(FILE_CHANNELS.read, withIpcErrorHandling((event, request: ChatFileRequest) =>
    files.readFile(owner(event), request?.chatId, request?.fileId)));

  ipcMain.handle(FILE_CHANNELS.delete, withIpcErrorHandling(async (event, request: ChatFileRequest) => {
    const userId = owner(event);
    const attachedIds = await messageService.getAttachmentFileIds(request?.chatId);
    // A different message may still reference the same file.
    if (!attachedIds.has(request?.fileId)) await files.deleteFile(userId, request?.chatId, request?.fileId);
  }));
}
