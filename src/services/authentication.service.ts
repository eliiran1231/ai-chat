import { inject, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegistrationDetails extends AuthCredentials {
  displayName?: string;
}

export abstract class AuthenticationProvider {
  abstract register(details: RegistrationDetails): Promise<AuthUser>;
  abstract login(credentials: AuthCredentials): Promise<AuthUser>;
  abstract logout(): Promise<void>;
  abstract getCurrentUser(): Promise<AuthUser | null>;
}

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
