import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import {
  supporterService,
  type SupporterPayload,
  type UpdateSupporterAgentPayload,
  type UpdateSupporterContextPayload,
} from '../services/supporter.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

export function registerSupporterHandlers(): void {
  ipcMain.handle(
    'db:getChatSupporter',
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, chatId: number) =>
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
    'db:updateSupporterContext',
    withIpcErrorHandling(
      async (_event: IpcMainInvokeEvent, payload: UpdateSupporterContextPayload) =>
        supporterService.updateSupporterContext(payload),
    ),
  );
}
