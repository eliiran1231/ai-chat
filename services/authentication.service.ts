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

export interface AuthenticationService {
  register(details: RegistrationDetails): Promise<AuthUser>;
  login(credentials: AuthCredentials): Promise<AuthUser>;
  logout(): Promise<void>;
  getCurrentUser(): AuthUser | null;
  hasSession(): boolean;
  getAccessToken(): Promise<string>;
}
