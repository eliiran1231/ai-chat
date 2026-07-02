export type SyncStateKind =
  | 'local-only'
  | 'connecting'
  | 'syncing'
  | 'online'
  | 'offline'
  | 'authentication-required'
  | 'blocked'
  | 'error';

export interface BlockedUpload {
  transactionId?: number;
  operationIds: string[];
  message: string;
}

export interface SyncState {
  kind: SyncStateKind;
  connected: boolean;
  lastSyncedAt?: string;
  error?: string;
  blockedUpload?: BlockedUpload;
}
