import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import {
  chatService,
  type ChatPayload,
  type CommitChatPayload,
  type UpdateChatAvatarPayload,
  type UpdateChatTitlePayload,
} from '../services/chat.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

type Uuid = string;

export function registerChatHandlers(): void {
  ipcMain.handle(
    'db:getChats',
    withIpcErrorHandling(async () => chatService.getChats()),
  );
  ipcMain.handle(
    'db:createChat',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chat: ChatPayload) =>
      chatService.createChat(chat),
    ),
  );
  ipcMain.handle(
    'db:commitChat',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chat: CommitChatPayload) =>
      chatService.commitChat(chat),
    ),
  );
  ipcMain.handle(
    'db:updateChatTitle',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, payload: UpdateChatTitlePayload) =>
      chatService.updateChatTitle(payload),
    ),
  );
  ipcMain.handle(
    'db:deleteChat',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: Uuid) =>
      chatService.deleteChat(chatId),
    ),
  );
  
  ipcMain.handle(
    'db:updateChatAvatar',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, payload: UpdateChatAvatarPayload) =>
      chatService.updateChatAvatar(payload),
    ),
  );
}
