import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { dbService } from '../services/db.service.js';
import {
  authenticationService,
} from '../services/server-authentication.service.js';
import type { AuthCredentials } from '../shared/auth/AuthCredentials.js';
import type { RegistrationDetails } from '../shared/auth/RegistrationDetails.js';
import { AUTH_CHANNELS } from '../shared/ipc/auth-channels.js';
import { withIpcErrorHandling } from './ipc-handler.js';

interface LogoutPolicy {
  clearLocalData: boolean;
}

const defaultLogoutPolicy: LogoutPolicy = { clearLocalData: false };

export function registerAuthenticationHandlers(): void {
  ipcMain.handle(
    AUTH_CHANNELS.register,
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, details: RegistrationDetails) => {
      const user = await authenticationService.register(details);
      await dbService.connect();
      return user;
    }),
  );
  ipcMain.handle(
    AUTH_CHANNELS.login,
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, credentials: AuthCredentials) => {
      const user = await authenticationService.login(credentials);
      await dbService.connect();
      return user;
    }),
  );
  ipcMain.handle(AUTH_CHANNELS.getCurrentUser, () => authenticationService.getCurrentUser());
  ipcMain.handle(
    AUTH_CHANNELS.logout,
    withIpcErrorHandling(async (_event: IpcMainInvokeEvent, policy = defaultLogoutPolicy) => {
      try {
        await authenticationService.logout();
      } finally {
        await dbService.disconnect();
        if (policy.clearLocalData) await dbService.clearLocalData();
      }
    }),
  );
}
