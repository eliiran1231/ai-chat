import { app, safeStorage } from 'electron';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import type { AuthCredentials } from '../interfaces/auth/AuthCredentials.js';
import type { AuthenticationService } from '../interfaces/auth/AuthenticationService.js';
import type { AuthUser } from '../interfaces/auth/AuthUser.js';
import type { RegistrationDetails } from '../interfaces/auth/RegistrationDetails.js';

interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: AuthUser;
}

interface StoredSession {
  encryptedRefreshToken: string;
  user: AuthUser;
}

export class ServerAuthenticationService implements AuthenticationService {
  private readonly backendUrl: string;
  private accessToken?: string;
  private refreshToken?: string;
  private accessTokenExpiresAt = 0;
  private refreshPromise?: Promise<string>;
  private user: AuthUser | null = null;
  private initialized = false;

  constructor(backendUrl = process.env['BACKEND_URL'] ?? 'http://localhost:3001') {
    this.backendUrl = backendUrl;
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.restoreSession();
  }

  register(details: RegistrationDetails): Promise<AuthUser> {
    return this.createSession('/api/auth/register', details);
  }

  login(credentials: AuthCredentials): Promise<AuthUser> {
    return this.createSession('/api/auth/login', credentials);
  }

  async logout(): Promise<void> {
    const refreshToken = this.refreshToken;
    try {
      if (refreshToken) {
        await fetch(`${this.backendUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${await this.getAccessToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      }
    } finally {
      this.clearSession();
    }
  }

  getCurrentUser(): AuthUser | null {
    return this.user;
  }

  hasSession(): boolean {
    return Boolean(this.refreshToken);
  }

  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt - 30_000) {
      return this.accessToken;
    }
    if (!this.refreshToken) throw new Error('The user is not authenticated.');

    this.refreshPromise ??= this.refreshAccessToken().finally(() => {
      this.refreshPromise = undefined;
    });

    return this.refreshPromise;
  }

  private async refreshAccessToken(): Promise<string> {
    const response = await this.request<AuthResponse>('/api/auth/refresh', {
      refresh_token: this.refreshToken,
    });
    this.setSession(response);
    return response.access_token;
  }

  private async createSession(endpoint: string, body: object): Promise<AuthUser> {
    const response = await this.request<AuthResponse>(endpoint, body);
    this.setSession(response);
    return response.user;
  }

  private async request<T>(endpoint: string, body: object): Promise<T> {
    const response = await fetch(`${this.backendUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => null)) as T | { error?: string } | null;
    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload
          ? (payload as { error?: string }).error
          : undefined;
      throw new Error(message ?? `Authentication request failed (${response.status}).`);
    }
    return payload as T;
  }

  private setSession(session: AuthResponse): void {
    this.accessToken = session.access_token;
    this.refreshToken = session.refresh_token;
    this.accessTokenExpiresAt = Date.now() + session.expires_in * 1000;
    this.user = session.user;
    this.persistSession();
  }

  private restoreSession(): void {
    const sessionPath = this.sessionPath;
    if (!safeStorage.isEncryptionAvailable() || !existsSync(sessionPath)) return;
    try {
      const stored = JSON.parse(readFileSync(sessionPath, 'utf8')) as StoredSession;
      this.refreshToken = safeStorage.decryptString(
        Buffer.from(stored.encryptedRefreshToken, 'base64'),
      );
      this.user = stored.user;
    } catch (error) {
      console.warn('Could not restore the authentication session.', error);
      this.clearSession();
    }
  }

  private persistSession(): void {
    if (!this.refreshToken || !this.user) return;
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('Secure credential storage is unavailable; the session will not persist.');
      return;
    }
    const stored: StoredSession = {
      encryptedRefreshToken: safeStorage.encryptString(this.refreshToken).toString('base64'),
      user: this.user,
    };
    writeFileSync(this.sessionPath, JSON.stringify(stored), { mode: 0o600 });
  }

  private clearSession(): void {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.accessTokenExpiresAt = 0;
    this.user = null;
    if (existsSync(this.sessionPath)) unlinkSync(this.sessionPath);
  }

  private get sessionPath(): string {
    return path.join(app.getPath('userData'), 'auth-session.json');
  }
}

export const authenticationService = new ServerAuthenticationService();
