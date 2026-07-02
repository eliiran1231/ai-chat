import { afterEach, describe, expect, it, vi } from 'vitest';
import { PowerSyncConnector } from '../../services/powersync.connector.ts';

const authentication = {
  getAccessToken: vi.fn().mockResolvedValue('access-token'),
} as never;

function databaseWithTransaction(complete = vi.fn()) {
  return {
    getNextCrudTransaction: vi.fn().mockResolvedValue({
      crud: [{ id: '1', op: 'PUT', table: 'chats', opData: { name: 'Chat' } }],
      complete,
    }),
  } as never;
}

describe('PowerSyncConnector.uploadData', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('completes a transaction only after a successful upload', async () => {
    const complete = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    }));

    await new PowerSyncConnector(authentication).uploadData(databaseWithTransaction(complete));

    expect(complete).toHaveBeenCalledOnce();
  });

  it('does not complete a rejected upload', async () => {
    const complete = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: false, error: 'rejected' }),
    }));

    await expect(
      new PowerSyncConnector(authentication).uploadData(databaseWithTransaction(complete)),
    ).rejects.toThrow('rejected');
    expect(complete).not.toHaveBeenCalled();
  });

  it('preserves queued CRUD when the network fails', async () => {
    const complete = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(
      new PowerSyncConnector(authentication).uploadData(databaseWithTransaction(complete)),
    ).rejects.toThrow('offline');
    expect(complete).not.toHaveBeenCalled();
  });
});
