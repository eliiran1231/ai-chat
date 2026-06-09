import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import {
  supporterService,
  type SupporterPayload,
  type UpdateSupporterAgentPayload,
  type CommitSupporterPayload,
} from '../services/supporter.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

type Uuid = string;

export function registerSupporterHandlers(): void {
  ipcMain.handle(
    'db:getChatSupporter',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: Uuid) =>
      supporterService.getChatSupporter(chatId),
    ),
  );
  ipcMain.handle(
    'db:createSupporter',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, supporter: SupporterPayload) =>
      supporterService.createSupporter(supporter),
    ),
  );
  ipcMain.handle(
    'db:updateSupporterAgent',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, payload: UpdateSupporterAgentPayload) =>
      supporterService.updateSupporterAgent(payload),
    ),
  );
  ipcMain.handle(
    'db:commitSupporter',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, payload: CommitSupporterPayload) =>
      supporterService.commitSupporter(payload),
    ),
  );
}
