import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import {
  chatService,
  type ChatPayload,
  type UpdateChatTitlePayload,
} from '../services/chat.service.js';

export function registerChatHandlers(): void {
  ipcMain.handle('db:getChats', async () => chatService.getChats());
  ipcMain.handle('db:createChat', async (_event: IpcMainInvokeEvent, chat: ChatPayload) =>
    chatService.createChat(chat),
  );
  ipcMain.handle(
    'db:updateChatTitle',
    async (_event: IpcMainInvokeEvent, payload: UpdateChatTitlePayload) =>
      chatService.updateChatTitle(payload),
  );
  ipcMain.handle('db:deleteChat', async (_event: IpcMainInvokeEvent, chatId: number) =>
    chatService.deleteChat(chatId),
  );
}
