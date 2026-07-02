import { app } from 'electron';
import * as path from 'node:path';
import { PowerSyncDatabase } from '@powersync/node';
import { AppSchema } from './powersync-schema.js';
import { PowerSyncConnector } from './powersync.connector.js';
import type { AuthenticationService } from '../interfaces/auth/AuthenticationService.js';
import { authenticationService } from './server-authentication.service.js';
import type { BlockedUpload, SyncState } from '../shared/sync/SyncState.js';

export type SqlParameter = string | number | null;
type Uuid = string;

export interface DbTransaction {
  execute(sql: string, params?: SqlParameter[]): Promise<void>;
  executeReturning<T>(sql: string, params?: SqlParameter[]): Promise<T[]>;
}

export interface InitialSyncOptions {
  timeoutMs?: number;
}

export class DbService {
  private database?: PowerSyncDatabase;
  private syncStarted = false;
  private blockedUpload?: BlockedUpload;
  private syncState: SyncState = { kind: 'local-only', connected: false };
  private readonly syncStateListeners = new Set<(state: SyncState) => void>();
  private unregisterStatusListener?: () => void;

  constructor(private readonly authentication: AuthenticationService = authenticationService) {}

  async initialize(): Promise<void> {
    if (this.database) return;

    this.database = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: path.join(app.getPath('userData'), 'ai-chat-powersync.sqlite'),
      },
    });
    this.unregisterStatusListener = this.database.registerListener({
      statusChanged: (status) => this.updateFromPowerSyncStatus(status),
    });

    if (this.authentication.hasSession()) {
      this.startSync();
      await this.waitForInitialSync();
    }
  }

  startSync(): void {
    if (!this.database) throw new Error('PowerSync database has not been initialized.');
    if (this.syncStarted) return;

    this.syncStarted = true;
    this.setSyncState({ kind: 'connecting', connected: false });
    const connector = new PowerSyncConnector(this.authentication, (upload) => {
      this.blockedUpload = upload;
      if (upload) {
        this.setSyncState({ kind: 'blocked', connected: true, blockedUpload: upload });
      }
    });
    void this.database.connect(connector).catch((error) => {
      this.syncStarted = false;
      const message = this.errorMessage(error);
      this.setSyncState({
        kind: message.toLocaleLowerCase().includes('authenticated')
          ? 'authentication-required'
          : 'error',
        connected: false,
        error: message,
      });
      console.error('PowerSync connection failed; continuing with local data.', error);
    });
  }

  async waitForInitialSync({ timeoutMs = 15_000 }: InitialSyncOptions = {}): Promise<boolean> {
    if (!this.database) throw new Error('PowerSync database has not been initialized.');
    const firstSyncTimeout = new AbortController();
    const timeout = setTimeout(() => firstSyncTimeout.abort(), timeoutMs);
    try {
      await this.database.waitForFirstSync(firstSyncTimeout.signal);
      return true;
    } catch {
      this.setSyncState({ kind: 'offline', connected: false });
      console.warn('PowerSync first sync was not available; starting in offline mode.');
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.database) return;
    await this.database.disconnect();
    this.syncStarted = false;
    this.setSyncState({
      kind: this.authentication.hasSession() ? 'offline' : 'local-only',
      connected: false,
    });
  }

  async clearLocalData(): Promise<void> {
    if (!this.database) return;
    await this.database.disconnectAndClear();
    this.syncStarted = false;
    this.blockedUpload = undefined;
    this.setSyncState({ kind: 'local-only', connected: false });
  }

  async close(): Promise<void> {
    if (!this.database) return;
    await this.database.close();
    this.unregisterStatusListener?.();
    this.unregisterStatusListener = undefined;
    this.database = undefined;
    this.syncStarted = false;
  }

  public parseJsonColumn(value: string | null, fieldName: string, rowId: Uuid) {
    if (!value) return undefined;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`Failed to parse ${fieldName} for row ${rowId}.`, error);
      return undefined;
    }
  }

  async execute(sql: string, params: SqlParameter[] = []): Promise<void> {
    await this.getDatabase().execute(sql, params);
  }

  async executeReturning<T>(sql: string, params: SqlParameter[] = []): Promise<T[]> {
    const result = await this.getDatabase().execute(sql, params);
    return (result.rows?._array ?? []) as T[];
  }

  writeTransaction<T>(callback: (transaction: DbTransaction) => Promise<T>): Promise<T> {
    return this.getDatabase().writeTransaction((transaction) =>
      callback({
        execute: async (sql, params = []) => {
          await transaction.execute(sql, params);
        },
        executeReturning: async <Row>(sql: string, params: SqlParameter[] = []) => {
          const result = await transaction.execute(sql, params);
          return (result.rows?._array ?? []) as Row[];
        },
      }),
    );
  }

  all<T>(sql: string, params: SqlParameter[] = []): Promise<T[]> {
    return this.getDatabase().getAll<T>(sql, params);
  }

  async get<T>(sql: string, params: SqlParameter[] = []): Promise<T | undefined> {
    return (await this.getDatabase().getOptional<T>(sql, params)) ?? undefined;
  }

  getSyncState(): SyncState {
    return this.syncState;
  }

  subscribeToSyncState(listener: (state: SyncState) => void): () => void {
    this.syncStateListeners.add(listener);
    listener(this.syncState);
    return () => this.syncStateListeners.delete(listener);
  }

  private updateFromPowerSyncStatus(status: PowerSyncDatabase['currentStatus']): void {
    if (this.blockedUpload) return;
    const flow = status.dataFlowStatus;
    const flowError = flow.uploadError ?? flow.downloadError;
    if (flowError) {
      this.setSyncState({
        kind: 'error',
        connected: status.connected,
        lastSyncedAt: status.lastSyncedAt?.toISOString(),
        error: this.errorMessage(flowError),
      });
      return;
    }

    const kind: SyncState['kind'] = status.connecting
      ? 'connecting'
      : flow.downloading || flow.uploading
        ? 'syncing'
        : status.connected
          ? 'online'
          : this.authentication.hasSession()
            ? 'offline'
            : 'local-only';
    this.setSyncState({
      kind,
      connected: status.connected,
      lastSyncedAt: status.lastSyncedAt?.toISOString(),
    });
  }

  private setSyncState(state: SyncState): void {
    this.syncState = state;
    for (const listener of this.syncStateListeners) listener(state);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private getDatabase(): PowerSyncDatabase {
    if (!this.database) throw new Error('PowerSync database has not been initialized.');
    return this.database;
  }
}

export const dbService = new DbService();
