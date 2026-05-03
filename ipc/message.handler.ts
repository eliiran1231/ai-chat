import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { messageService, type MessagePayload } from '../services/message.service.js';

export function registerMessageHandlers(): void {
  ipcMain.handle('db:getChatMessages', async (_event: IpcMainInvokeEvent, chatId: number) =>
    messageService.getChatMessages(chatId),
  );
  ipcMain.handle('db:createMessage', async (_event: IpcMainInvokeEvent, message: MessagePayload) =>
    messageService.createMessage(message),
  );
  ipcMain.handle('db:markChatRead', async (_event: IpcMainInvokeEvent, chatId: number) =>
    messageService.markChatRead(chatId),
  );
}
