import { inject, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import type { AuthCredentials } from '../interfaces/auth/AuthCredentials';
import type { AuthenticationProvider } from '../interfaces/auth/AuthenticationProvider';
import type { AuthUser } from '../interfaces/auth/AuthUser';
import type { RegistrationDetails } from '../interfaces/auth/RegistrationDetails';

@Injectable({ providedIn: 'root' })
export class ServerAuthenticationService implements AuthenticationProvider {
  private readonly electron = inject(ElectronService);

  register(details: RegistrationDetails): Promise<AuthUser> {
    return this.electron.invoke<AuthUser>('auth:register', details);
  }

  login(credentials: AuthCredentials): Promise<AuthUser> {
    return this.electron.invoke<AuthUser>('auth:login', credentials);
  }

  logout(): Promise<void> {
    return this.electron.invoke<void>('auth:logout');
  }

  getCurrentUser(): Promise<AuthUser | null> {
    return this.electron.invoke<AuthUser | null>('auth:getCurrentUser');
  }
}
