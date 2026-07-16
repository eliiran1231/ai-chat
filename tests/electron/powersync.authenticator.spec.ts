import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { AUTH_CHANNELS } from '../../shared/ipc/auth-channels.ts';
import { SYNC_CHANNELS } from '../../shared/ipc/sync-channels.ts';
import type { SyncState } from '../../shared/sync/SyncState.ts';
import { PowerSyncAuthenticationService } from '../../src/authenticators/powersync.authenticator.ts';
import { ElectronService } from '../../src/services/electron.service.ts';

describe('PowerSyncAuthenticationService state', () => {
  function createService(currentUser: unknown, currentUserError?: Error) {
    const listeners = new Map<string, (payload: unknown) => void>();
    const electron = {
      invoke: vi.fn((channel: string) => {
        if (channel === SYNC_CHANNELS.getStatus) {
          return Promise.resolve({ kind: 'local-only', connected: false });
        }
        if (channel === AUTH_CHANNELS.getCurrentUser && currentUserError) {
          return Promise.reject(currentUserError);
        }
        return Promise.resolve(currentUser);
      }),
      on: vi.fn((channel: string, listener: (payload: unknown) => void) => {
        listeners.set(channel, listener);
        return () => listeners.delete(channel);
      }),
    };
    const injector = Injector.create({
      providers: [{ provide: ElectronService, useValue: electron }],
    });
    const service = runInInjectionContext(injector, () => new PowerSyncAuthenticationService());
    return { service, listeners };
  }

  it('distinguishes checking from an initialized unauthenticated state', async () => {
    const { service } = createService(null);
    expect(service.state().kind).toBe('checking');
    await service.getCurrentUser();
    expect(service.state()).toEqual({ kind: 'unauthenticated', user: null });
  });

  it('surfaces authentication initialization errors', async () => {
    const { service } = createService(null, new Error('session unavailable'));
    await expect(service.getCurrentUser()).rejects.toThrow('session unavailable');
    expect(service.state()).toEqual({
      kind: 'error',
      user: null,
      error: 'session unavailable',
    });
  });

  it('reacts to sync status events from the main process', () => {
    const { service, listeners } = createService(null);
    const state: SyncState = { kind: 'blocked', connected: true, error: 'invalid row' };
    listeners.get(SYNC_CHANNELS.statusChanged)?.(state);
    expect(service.syncState()).toEqual(state);
  });
});
