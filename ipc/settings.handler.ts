import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

import {
  appSettingsService,
  type GeneralSettings,
} from '../services/app-settings.service.js';
import { withIpcErrorHandling } from './ipc-handler.js';

export function registerSettingsHandlers(): void {
  ipcMain.handle(
    'settings:getGeneral',
    withIpcErrorHandling(async () => appSettingsService.getGeneralSettings()),
  );

  ipcMain.handle(
    'settings:updateGeneral',
    withIpcErrorHandling(
      async (_event: IpcMainInvokeEvent, settings: Partial<GeneralSettings>) =>
        appSettingsService.updateGeneralSettings(settings),
    ),
  );

  ipcMain.handle(
    'settings:resetGeneral',
    withIpcErrorHandling(async () => appSettingsService.resetGeneralSettings()),
  );
}
