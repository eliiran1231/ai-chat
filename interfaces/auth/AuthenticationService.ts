import type { AuthCredentials } from '../../shared/auth/AuthCredentials.js';
import type { AuthUser } from '../../shared/auth/AuthUser.js';
import type { RegistrationDetails } from '../../shared/auth/RegistrationDetails.js';

export interface AuthenticationService {
  register(details: RegistrationDetails): Promise<AuthUser>;
  login(credentials: AuthCredentials): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  hasSession(): boolean;
  getAccessToken(): Promise<string>;
}
