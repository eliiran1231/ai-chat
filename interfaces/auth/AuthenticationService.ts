import type { AuthCredentials } from './AuthCredentials.js';
import type { AuthUser } from './AuthUser.js';
import type { RegistrationDetails } from './RegistrationDetails.js';

export interface AuthenticationService {
  register(details: RegistrationDetails): Promise<AuthUser>;
  login(credentials: AuthCredentials): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  hasSession(): boolean;
  getAccessToken(): Promise<string>;
}
