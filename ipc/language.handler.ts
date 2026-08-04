import { ipcMain } from 'electron';

import { getAllLanguages, getLanguage, listLanguages } from './language.service.js';

export function registerLanguageHandlers(): void {
  ipcMain.handle('languages:getAll', getAllLanguages);
  ipcMain.handle('languages:list', listLanguages);
  ipcMain.handle('languages:get', (_event, code: string) => getLanguage(code));
}
