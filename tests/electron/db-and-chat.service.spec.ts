import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  connect: vi.fn().mockResolvedValue(undefined),
  waitForFirstSync: vi.fn(),
  disconnect: vi.fn().mockResolvedValue(undefined),
  disconnectAndClear: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  execute: vi.fn().mockResolvedValue({ rowsAffected: 0 }),
  getAll: vi.fn(),
  getOptional: vi.fn(),
  writeTransaction: vi.fn(),
  registerListener: vi.fn(),
}));
const listeners = vi.hoisted(() => ({ statusChanged: undefined as undefined | ((status: any) => void) }));

vi.mock('electron', () => ({ app: { getPath: () => 'test-user-data' } }));
vi.mock('@powersync/node', async (importOriginal) => {
  const original = await importOriginal<typeof import('@powersync/node')>();
  class MockPowerSyncDatabase {
    constructor() {
      return database;
    }
  }
  return { ...original, PowerSyncDatabase: MockPowerSyncDatabase };
});

import { DbService } from '../../services/db.service.ts';
import { ChatService } from '../../services/chat.service.ts';
import { MessageService } from '../../services/message.service.ts';

const authenticated = { hasSession: () => true } as never;
const anonymous = { hasSession: () => false } as never;

describe('DbService sync lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.connect.mockResolvedValue(undefined);
    database.execute.mockResolvedValue({ rowsAffected: 0 });
    database.registerListener.mockImplementation(({ statusChanged }) => {
      listeners.statusChanged = statusChanged;
      return vi.fn();
    });
  });

  it('starts sync for a persisted session', async () => {
    database.waitForFirstSync.mockResolvedValue(undefined);
    const service = new DbService(authenticated);

    await service.initialize();

    expect(database.connect).toHaveBeenCalledOnce();
    expect(database.waitForFirstSync).toHaveBeenCalledOnce();
  });

  it('keeps local data available without a session', async () => {
    const service = new DbService(anonymous);
    await service.initialize();
    await service.execute('INSERT INTO chats (id) VALUES (?)', ['local-chat']);

    expect(database.connect).not.toHaveBeenCalled();
    expect(database.disconnectAndClear).not.toHaveBeenCalled();
    expect(database.execute).toHaveBeenCalledOnce();
  });

  it('permits local CRUD when initial sync fails', async () => {
    database.waitForFirstSync.mockRejectedValue(new Error('offline'));
    const service = new DbService(authenticated);
    await service.initialize();

    await expect(service.execute('INSERT INTO chats (id) VALUES (?)', ['offline-chat'])).resolves.toBeUndefined();
  });

  it('reconnects so previously queued local changes can upload', async () => {
    database.waitForFirstSync.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const service = new DbService(authenticated);
    await service.initialize();
    await service.execute('INSERT INTO chats (id) VALUES (?)', ['queued-chat']);
    await service.disconnect();

    service.startSync();
    await expect(service.waitForInitialSync()).resolves.toBe(true);
    expect(database.connect).toHaveBeenCalledTimes(2);
  });

  it('derives connecting, syncing, online, and offline states', async () => {
    database.waitForFirstSync.mockResolvedValue(undefined);
    const service = new DbService(authenticated);
    await service.initialize();

    listeners.statusChanged?.({
      connecting: false,
      connected: true,
      lastSyncedAt: new Date('2026-01-01T00:00:00.000Z'),
      dataFlowStatus: { downloading: true, uploading: false },
    });
    expect(service.getSyncState().kind).toBe('syncing');
    listeners.statusChanged?.({
      connecting: false,
      connected: true,
      lastSyncedAt: new Date('2026-01-01T00:00:00.000Z'),
      dataFlowStatus: { downloading: false, uploading: false },
    });
    expect(service.getSyncState()).toMatchObject({ kind: 'online', connected: true });
    await service.disconnect();
    expect(service.getSyncState().kind).toBe('offline');
  });

  it('clears or retains local data according to logout policy', async () => {
    const service = new DbService(anonymous);
    await service.initialize();

    await service.disconnect();
    expect(database.disconnectAndClear).not.toHaveBeenCalled();
    await service.clearLocalData();
    expect(database.disconnectAndClear).toHaveBeenCalledOnce();
  });
});

describe('ChatService.deleteChat', () => {
  it('deletes children and parent in one transaction', async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const executeReturning = vi.fn().mockResolvedValue([{ id: 'chat-1' }]);
    const db = {
      writeTransaction: vi.fn((callback) => callback({ execute, executeReturning })),
    } as never;

    await expect(new ChatService(db).deleteChat('chat-1')).resolves.toBe(true);
    expect(execute.mock.calls.map(([sql]) => sql)).toEqual([
      'DELETE FROM messages WHERE chat_id = ?',
      'DELETE FROM supporters WHERE chat_id = ?',
    ]);
    expect(executeReturning).toHaveBeenCalledWith(
      'DELETE FROM chats WHERE id = ? RETURNING id',
      ['chat-1'],
    );
  });
});

describe('MessageService.getChatMessages', () => {
  it('uses the PowerSync id column as the stable pagination tie-breaker', async () => {
    const all = vi.fn().mockResolvedValue([]);
    const service = new MessageService({ all } as never);

    await service.getChatMessages('chat-1', 20, 10);

    expect(all).toHaveBeenCalledOnce();
    const [sql, parameters] = all.mock.calls[0];
    expect(sql).toContain('ORDER BY time DESC, id DESC');
    expect(sql).not.toContain('rowid');
    expect(parameters).toEqual(['chat-1', 10, 20]);
  });
});
