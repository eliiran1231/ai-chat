import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import {
  FILE_CHANNELS,
  type DeleteFileRequest,
  type SaveChatFileRequest,
} from '../shared/files/ChatFile.js';
import { authenticationService } from '../services/server-authentication.service.js';
import { attachmentService } from '../services/attachment.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

export function registerAttachmentHandlers(
  isTrustedSender: (event: IpcMainInvokeEvent) => boolean,
): void {
  function owner(event: IpcMainInvokeEvent): string {
    if (!isTrustedSender(event)) throw new Error('Untrusted attachment request.');
    return authenticationService.getCurrentUser()?.id ?? 'local';
  }

  ipcMain.handle(
    FILE_CHANNELS.save,
    withIpcErrorHandling((event, request: SaveChatFileRequest) =>
      attachmentService.saveAttachment(request.chatId, request.name, request.bytes),
    ),
  );

  ipcMain.handle(
    FILE_CHANNELS.delete,
    withIpcErrorHandling((event, request: DeleteFileRequest) =>
      attachmentService.deleteAttachment(request.chatId, request.fileName),
    ),
  );

  ipcMain.handle(
    FILE_CHANNELS.list,
    withIpcErrorHandling((event, chatId: string) => attachmentService.listAttachments(chatId)),
  );
}
