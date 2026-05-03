import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import {
  supporterService,
  type SupporterPayload,
  type UpdateSupporterAgentPayload,
  type UpdateSupporterContextPayload,
} from '../services/supporter.service.js';

export function registerSupporterHandlers(): void {
  ipcMain.handle('db:getChatSupporter', async (_event: IpcMainInvokeEvent, chatId: number) =>
    supporterService.getChatSupporter(chatId),
  );
  ipcMain.handle(
    'db:createSupporter',
    async (_event: IpcMainInvokeEvent, supporter: SupporterPayload) =>
      supporterService.createSupporter(supporter),
  );
  ipcMain.handle(
    'db:updateSupporterAgent',
    async (_event: IpcMainInvokeEvent, payload: UpdateSupporterAgentPayload) =>
      supporterService.updateSupporterAgent(payload),
  );
  ipcMain.handle(
    'db:updateSupporterContext',
    async (_event: IpcMainInvokeEvent, payload: UpdateSupporterContextPayload) =>
      supporterService.updateSupporterContext(payload),
  );
}
