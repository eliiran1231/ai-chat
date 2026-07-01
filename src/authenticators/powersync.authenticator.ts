import { inject, Injectable } from '@angular/core';
import type { AuthCredentials } from '../interfaces/auth/AuthCredentials';
import type { AuthenticationProvider } from '../interfaces/auth/AuthenticationProvider';
import type { AuthUser } from '../interfaces/auth/AuthUser';
import type { RegistrationDetails } from '../interfaces/auth/RegistrationDetails';
import { ElectronService } from '../services/electron.service';

@Injectable({ providedIn: 'root' })
export class PowerSyncAuthenticationService implements AuthenticationProvider {
  loggedIn: boolean = false;
  private readonly electron = inject(ElectronService);

  async register(details: RegistrationDetails): Promise<AuthUser> {
    const user = await this.electron.invoke<AuthUser>('auth:register', details);
    this.loggedIn = true;
    return user;
  }

  async login(credentials: AuthCredentials): Promise<AuthUser> {
    const user = await this.electron.invoke<AuthUser>('auth:login', credentials);
    this.loggedIn = true;
    return user;
  }

  async logout(): Promise<void> {
    await this.electron.invoke<void>('auth:logout');
    this.loggedIn = false;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const user = await this.electron.invoke<AuthUser | null>('auth:getCurrentUser');
    this.loggedIn = Boolean(user);
    return user;
  }
}
