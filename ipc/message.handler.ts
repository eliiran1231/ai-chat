import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { messageService, type MessagePayload } from '../services/message.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

export function registerMessageHandlers(): void {
  ipcMain.handle(
    'db:getChatMessages',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: number) =>
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
    'db:markChatRead',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: number) =>
      messageService.markChatRead(chatId),
    ),
  );
}
