import type { Signal } from '@angular/core';
import type { AuthCredentials } from '../../../shared/auth/AuthCredentials';
import type { AuthUser } from '../../../shared/auth/AuthUser';
import type { RegistrationDetails } from '../../../shared/auth/RegistrationDetails';

export interface LogoutPolicy {
  clearLocalData: boolean;
}

export interface AuthenticationProviderOptions {
  logoutPolicy: LogoutPolicy;
}

export const defaultAuthenticationProviderOptions: AuthenticationProviderOptions = {
  logoutPolicy: { clearLocalData: false },
};

export interface AuthenticationProvider {
  readonly options: AuthenticationProviderOptions;
  readonly currentUser: Signal<AuthUser | null>;
  readonly loggedIn: Signal<boolean>;
  register(details: RegistrationDetails): Promise<AuthUser>;
  login(credentials: AuthCredentials): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
}
