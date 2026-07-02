import { computed, inject, Injectable, signal } from '@angular/core';
import type { AuthCredentials } from '../../shared/auth/AuthCredentials';
import {
  defaultAuthenticationProviderOptions,
  type AuthenticationProvider,
  type AuthenticationProviderOptions,
} from '../interfaces/auth/AuthenticationProvider';
import type { AuthUser } from '../../shared/auth/AuthUser';
import type { RegistrationDetails } from '../../shared/auth/RegistrationDetails';
import { AUTH_CHANNELS } from '../../shared/ipc/auth-channels';
import { ElectronService } from '../services/electron.service';
import type { AuthState } from '../../shared/auth/AuthState';
import type { SyncState } from '../../shared/sync/SyncState';
import { SYNC_CHANNELS } from '../../shared/ipc/sync-channels';

@Injectable({ providedIn: 'root' })
export class PowerSyncAuthenticationService implements AuthenticationProvider {
  readonly options: AuthenticationProviderOptions = defaultAuthenticationProviderOptions;
  private readonly _state = signal<AuthState>({ kind: 'checking', user: null });
  readonly state = this._state.asReadonly();
  readonly currentUser = computed(() => this.state().user);
  readonly loggedIn = computed(() => this.currentUser() !== null);
  private readonly _syncState = signal<SyncState>({ kind: 'local-only', connected: false });
  readonly syncState = this._syncState.asReadonly();
  private readonly electron = inject(ElectronService);

  constructor() {
    this.electron.on<SyncState>(SYNC_CHANNELS.statusChanged, (state) => this._syncState.set(state));
    void this.refreshSyncState();
  }

  async register(details: RegistrationDetails): Promise<AuthUser> {
    const user = await this.electron.invoke<AuthUser>(AUTH_CHANNELS.register, details);
    this._state.set({ kind: 'authenticated', user });
    return user;
  }

  async login(credentials: AuthCredentials): Promise<AuthUser> {
    const user = await this.electron.invoke<AuthUser>(AUTH_CHANNELS.login, credentials);
    this._state.set({ kind: 'authenticated', user });
    return user;
  }

  async logout(): Promise<void> {
    await this.electron.invoke<void>(AUTH_CHANNELS.logout, this.options.logoutPolicy);
    this._state.set({ kind: 'unauthenticated', user: null });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    this._state.set({ kind: 'checking', user: null });
    try {
      const user = await this.electron.invoke<AuthUser | null>(AUTH_CHANNELS.getCurrentUser);
      this._state.set(
        user ? { kind: 'authenticated', user } : { kind: 'unauthenticated', user: null },
      );
      return user;
    } catch (error) {
      this._state.set({ kind: 'error', user: null, error: this.errorMessage(error) });
      throw error;
    }
  }

  private async refreshSyncState(): Promise<void> {
    try {
      this._syncState.set(await this.electron.invoke<SyncState>(SYNC_CHANNELS.getStatus));
    } catch {
      // Electron may not be available in browser-only tests or previews.
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
