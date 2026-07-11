import { app, BrowserWindow, ipcMain, shell } from 'electron';
import type { Event } from 'electron';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { dbService } from './services/db.service.js';
import { registerChatHandlers } from './ipc/chat.handler.js';
import { registerMessageHandlers } from './ipc/message.handler.js';
import { registerSupporterHandlers } from './ipc/supporter.handler.js';
import { registerAuthenticationHandlers } from './ipc/authentication.handler.js';
import { authenticationService } from './services/server-authentication.service.js';
import { registerSyncHandlers } from './ipc/sync.handler.js';
import { registerDeepAgentHandlers } from './ipc/deep-agent.handler.js';
import { deepAgentService } from './services/deep-agent.service.js';
import { PermissionViewService } from './services/permissions/permission-view.service.js';
import { PermissionService } from './services/permissions/permission.service.js';
import { FilesystemReadPermissionPolicy } from './services/permissions/filesystem-read-permission.policy.js';
import { DeepAgentPermissionService } from './services/permissions/deep-agent-permission.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getNetworkIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return '127.0.0.1';
}

function getFullName(): Promise<string | null> {
  return new Promise((resolve) => {
    const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-LocalUser -Name $env:USERNAME).FullName"`;

    exec(command, { encoding: 'utf8' }, (err, out) => {
      if (err) return resolve(null);
      resolve(out.trim());
    });
  });
}

async function getBasicInfo(): Promise<{
  username: string;
  displayName: string;
  computerName: string;
  ip: string;
}> {
  const userInfo = os.userInfo();
  const username = userInfo.username || process.env['USERNAME'] || process.env['USER'] || 'unknown';
  const displayName = (await getFullName()) || username;
  const computerName = os.hostname();

  return {
    username,
    displayName,
    computerName,
    ip: getNetworkIp(),
  };
}

function registerSystemHandlers(): void {
  ipcMain.handle('system:getBasicInfo', async () => {
    return getBasicInfo();
  });
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

let permissionView: PermissionViewService | undefined;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 360,
    height: 680,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.once('ready-to-show', () => {
    win.focus();
    win.webContents.focus();
  });

  win.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }

    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event: Event, url: string) => {
    const currentUrl = win.webContents.getURL();

    if (url !== currentUrl && isExternalUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  win.loadFile(path.join(__dirname, './dist/ai-chat/browser/index.html'));
  permissionView = new PermissionViewService(win, path.join(__dirname, 'permission'));
  const permissions = new PermissionService(permissionView);
  deepAgentService.setPermissionGate(
    new DeepAgentPermissionService(
      permissions,
      new FilesystemReadPermissionPolicy([path.parse(app.getPath('home')).root]),
    ),
  );
  return win;
}

app.whenReady().then(async () => {
  authenticationService.initialize();
  await dbService.initialize();
  createWindow();
  deepAgentService.initialize();
  registerChatHandlers();
  registerMessageHandlers();
  registerSupporterHandlers();
  registerAuthenticationHandlers();
  registerSyncHandlers();
  registerDeepAgentHandlers();
  registerSystemHandlers();
  //Menu.setApplicationMenu(null);
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    void dbService.close();
    deepAgentService.close();
    app.quit();
  }
});
