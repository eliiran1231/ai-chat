import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (...args: any[]) => Promise<any>>(),
  files: { saveFile: vi.fn(), listFiles: vi.fn(), readFile: vi.fn(), deleteFile: vi.fn() },
  linked: vi.fn(),
}));
vi.mock('electron', () => ({ app: { getPath: () => 'unused-test-path' }, ipcMain: {
  handle: (name: string, handler: (...args: any[]) => Promise<any>) => mocks.handlers.set(name, handler),
} }));
vi.mock('../../services/file-explorer.service.js', () => ({
  FileExplorerService: class { constructor() { return mocks.files; } },
}));
vi.mock('../../services/server-authentication.service.js', () => ({
  authenticationService: { getCurrentUser: () => ({ id: 'current-user' }) },
}));
vi.mock('../../services/message.service.js', () => ({ messageService: { getAttachmentFileIds: mocks.linked } }));

import { registerFileExplorerHandlers } from '../../ipc/file-explorer.handler.ts';

describe('Chat file IPC', () => {
  const invoke = (channel: string, request: unknown, trusted = true) => mocks.handlers.get(channel)!({ trusted }, request);
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.handlers.clear();
    mocks.linked.mockResolvedValue(new Set(['attached']));
    registerFileExplorerHandlers(event => (event as unknown as { trusted: boolean }).trusted);
  });

  it('only lists files associated with persisted messages', async () => {
    mocks.files.listFiles.mockResolvedValue([{ id: 'attached' }, { id: 'failed-send' }]);
    expect(await invoke('files:list', { chatId: 'chat-a' })).toEqual([{ id: 'attached' }]);
    expect(mocks.files.listFiles).toHaveBeenCalledWith('current-user', 'chat-a');
  });

  it('preserves shared attachments until the last message reference is gone', async () => {
    await invoke('files:delete', { chatId: 'chat-a', fileId: 'attached' });
    expect(mocks.files.deleteFile).not.toHaveBeenCalled();
    mocks.linked.mockResolvedValue(new Set());
    await invoke('files:delete', { chatId: 'chat-a', fileId: 'attached' });
    expect(mocks.files.deleteFile).toHaveBeenCalledWith('current-user', 'chat-a', 'attached');
  });

  it('rejects an untrusted sender before accessing files', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(invoke('files:save', { chatId: 'chat-a' }, false)).rejects.toThrow('Untrusted');
    expect(mocks.files.saveFile).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
