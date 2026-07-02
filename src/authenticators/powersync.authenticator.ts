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

@Injectable({ providedIn: 'root' })
export class PowerSyncAuthenticationService implements AuthenticationProvider {
  readonly options: AuthenticationProviderOptions = defaultAuthenticationProviderOptions;
  private readonly _currentUser = signal<AuthUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly loggedIn = computed(() => this.currentUser() !== null);
  private readonly electron = inject(ElectronService);

  async register(details: RegistrationDetails): Promise<AuthUser> {
    const user = await this.electron.invoke<AuthUser>(AUTH_CHANNELS.register, details);
    this._currentUser.set(user);
    return user;
  }

  async login(credentials: AuthCredentials): Promise<AuthUser> {
    const user = await this.electron.invoke<AuthUser>(AUTH_CHANNELS.login, credentials);
    this._currentUser.set(user);
    return user;
  }

  async logout(): Promise<void> {
    await this.electron.invoke<void>(AUTH_CHANNELS.logout, this.options.logoutPolicy);
    this._currentUser.set(null);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const user = await this.electron.invoke<AuthUser | null>(AUTH_CHANNELS.getCurrentUser);
    this._currentUser.set(user);
    return user;
  }
}
