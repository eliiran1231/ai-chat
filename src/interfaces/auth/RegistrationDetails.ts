import type { AuthCredentials } from './AuthCredentials';

export interface RegistrationDetails extends AuthCredentials {
  displayName?: string;
}
