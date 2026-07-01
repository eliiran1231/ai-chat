import type { AuthCredentials } from './AuthCredentials';
import type { AuthUser } from './AuthUser';
import type { RegistrationDetails } from './RegistrationDetails';

export interface AuthenticationProvider {
  loggedIn: boolean;
  register(details: RegistrationDetails): Promise<AuthUser>;
  login(credentials: AuthCredentials): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
}
