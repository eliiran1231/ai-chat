import type { AuthUser } from './AuthUser.js';

export type AuthState =
  | { kind: 'checking'; user: null }
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'unauthenticated'; user: null }
  | { kind: 'error'; user: null; error: string };
