import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { messageService, type MessagePayload } from '../services/message.service.js';
import type { CommitMessagePayload } from '../services/message.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

type Uuid = string;
type GetChatMessagesRequest = {
  chatId: Uuid;
  offset: number;
  limit: number;
};

export function registerMessageHandlers(): void {
  ipcMain.handle(
    'db:getChatMessages',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, request: GetChatMessagesRequest) =>
      messageService.getChatMessages(request.chatId, request.offset, request.limit),
    ),
  );
  ipcMain.handle(
    'db:createMessage',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, message: MessagePayload) =>
      messageService.createMessage(message),
    ),
  );
  ipcMain.handle(
    'db:commitMessage',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, message: CommitMessagePayload) =>
      messageService.commitMessage(message),
    ),
  );
  ipcMain.handle(
    'db:deleteMessage',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, messageId: Uuid) =>
      messageService.deleteMessage(messageId),
    ),
  );
}
