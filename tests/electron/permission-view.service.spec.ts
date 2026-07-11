import { beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => {
  const ipcListeners = new Map<string, (...args: unknown[]) => void>();
  const views: MockView[] = [];

  class MockContents {
    destroyed = false;
    listeners = new Map<string, (...args: unknown[]) => void>();
    session = {
      setPermissionRequestHandler: vi.fn(),
      webRequest: { onBeforeRequest: vi.fn() },
    };
    setWindowOpenHandler = vi.fn();
    on = vi.fn((name: string, listener: (...args: unknown[]) => void) => {
      this.listeners.set(name, listener);
    });
    once = this.on;
    loadFile = vi.fn(async () => undefined);
    executeJavaScript = vi.fn(async () => undefined);
    focus = vi.fn();
    isDestroyed = vi.fn(() => this.destroyed);
    close = vi.fn(() => { this.destroyed = true; });
  }

  class MockView {
    webContents = new MockContents();
    setBackgroundColor = vi.fn();
    setBounds = vi.fn();
    constructor(public options: unknown) { views.push(this); }
  }

  return {
    ipcListeners,
    views,
    WebContentsView: MockView,
    ipcMain: {
      on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
        ipcListeners.set(channel, listener);
      }),
      removeListener: vi.fn(),
    },
  };
});

vi.mock('electron', () => ({
  ipcMain: electron.ipcMain,
  WebContentsView: electron.WebContentsView,
}));

import { PermissionViewService } from '../../services/permissions/permission-view.service.ts';

describe('PermissionViewService', () => {
  beforeEach(() => {
    electron.views.length = 0;
    electron.ipcListeners.clear();
  });

  it('accepts a decision only from the active permission webContents object', async () => {
    const window = {
      on: vi.fn(),
      getContentSize: vi.fn(() => [360, 680]),
      contentView: { addChildView: vi.fn(), removeChildView: vi.fn() },
    };
    const service = new PermissionViewService(window as never, 'C:\\permission');
    const pending = service.present({
      id: 'permission-1',
      kind: 'filesystem.read',
      title: 'Allow file access?',
      description: 'Read a file',
      resource: 'C:\\safe.txt',
      operation: { name: 'read_file', arguments: { file_path: 'C:\\safe.txt' } },
      createdAt: new Date().toISOString(),
    });
    await Promise.resolve();
    const view = electron.views[0];
    expect(view.setBounds).toHaveBeenCalledWith({ x: 0, y: 0, width: 360, height: 680 });
    const decide = electron.ipcListeners.get('system-permission:decision')!;
    let settled = false;
    void pending.then(() => { settled = true; });

    decide({ sender: {} }, 'approve');
    await Promise.resolve();
    expect(settled).toBe(false);

    decide({ sender: view.webContents }, 'approve');
    await expect(pending).resolves.toBe('approve');
  });
});
