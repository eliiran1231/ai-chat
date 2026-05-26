import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { messageService, type MessagePayload } from '../services/message.service.js';
import type { UpdateMessagePayload } from '../services/message.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

type Uuid = string;

export function registerMessageHandlers(): void {
  ipcMain.handle(
    'db:getChatMessages',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: Uuid) =>
      messageService.getChatMessages(chatId),
    ),
  );
  ipcMain.handle(
    'db:createMessage',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, message: MessagePayload) =>
      messageService.createMessage(message),
    ),
  );
  ipcMain.handle(
    'db:updateMessage',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, message: UpdateMessagePayload) =>
      messageService.updateMessage(message),
    ),
  );
  ipcMain.handle(
    'db:deleteMessage',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, messageId: Uuid) =>
      messageService.deleteMessage(messageId),
    ),
  );
  ipcMain.handle(
    'db:markChatRead',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: Uuid) =>
      messageService.markChatRead(chatId),
    ),
  );
}
