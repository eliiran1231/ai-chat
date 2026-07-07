import type { AuthCredentials } from './AuthCredentials.js';

export interface RegistrationDetails extends AuthCredentials {
  displayName?: string;
}
