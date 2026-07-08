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
      json: () => Promise.resolve({ outcome: 'accepted' }),
    }));

    await new PowerSyncConnector(authentication).uploadData(databaseWithTransaction(complete));

    expect(complete).toHaveBeenCalledOnce();
  });

  it('does not complete a retryable upload failure', async () => {
    const complete = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ outcome: 'retryable_error', error: 'try again' }),
    }));

    await expect(
      new PowerSyncConnector(authentication).uploadData(databaseWithTransaction(complete)),
    ).rejects.toThrow('try again');
    expect(complete).not.toHaveBeenCalled();
  });

  it('reports and completes a permanently rejected upload to unblock the queue', async () => {
    const complete = vi.fn();
    const reportBlocked = vi.fn();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ outcome: 'permanent_error', error: 'invalid row' }),
    }));

    await new PowerSyncConnector(authentication, reportBlocked).uploadData(
      databaseWithTransaction(complete),
    );

    expect(complete).toHaveBeenCalledOnce();
    expect(reportBlocked).toHaveBeenCalledWith({
      operationIds: ['1'],
      message: 'invalid row',
    });
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
