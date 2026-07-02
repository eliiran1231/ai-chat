import { beforeEach, describe, expect, it, vi } from 'vitest';

const electron = vi.hoisted(() => ({
  app: { getPath: vi.fn().mockReturnValue('test-user-data') },
  safeStorage: {
    isEncryptionAvailable: vi.fn().mockReturnValue(true),
    decryptString: vi.fn().mockReturnValue('persisted-refresh-token'),
    encryptString: vi.fn().mockReturnValue(Buffer.from('encrypted')),
  },
}));
const fileSystem = vi.hoisted(() => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('electron', () => electron);
vi.mock('node:fs', () => fileSystem);

import { ServerAuthenticationService } from '../../services/server-authentication.service.ts';

describe('ServerAuthenticationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem.existsSync.mockReturnValue(false);
  });

  it('deduplicates simultaneous access-token refreshes', async () => {
    fileSystem.existsSync.mockReturnValue(true);
    fileSystem.readFileSync.mockReturnValue(JSON.stringify({
      encryptedRefreshToken: 'encrypted',
      user: { id: 'u1', email: 'user@example.com' },
    }));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'access',
        refresh_token: 'rotated-refresh',
        expires_in: 3600,
        user: { id: 'u1', email: 'user@example.com' },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const service = new ServerAuthenticationService();
    service.initialize();

    await expect(Promise.all([service.getAccessToken(), service.getAccessToken()])).resolves.toEqual([
      'access',
      'access',
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('restores a persisted session on startup', () => {
    fileSystem.existsSync.mockReturnValue(true);
    fileSystem.readFileSync.mockReturnValue(JSON.stringify({
      encryptedRefreshToken: 'encrypted',
      user: { id: 'u1', email: 'user@example.com' },
    }));
    const service = new ServerAuthenticationService();

    service.initialize();

    expect(service.hasSession()).toBe(true);
    expect(service.getCurrentUser()).toEqual({ id: 'u1', email: 'user@example.com' });
  });

  it('starts without a session when no persisted session exists', () => {
    const service = new ServerAuthenticationService();
    service.initialize();

    expect(service.hasSession()).toBe(false);
    expect(service.getCurrentUser()).toBeNull();
  });
});
