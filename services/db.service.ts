import { app } from 'electron';
import * as path from 'node:path';
import { PowerSyncDatabase } from '@powersync/node';
import { AppSchema } from './powersync-schema.js';
import { PowerSyncConnector } from './powersync.connector.js';
import type { AuthenticationService } from '../interfaces/auth/AuthenticationService.js';
import { authenticationService } from './server-authentication.service.js';

export type SqlParameter = string | number | null;
type Uuid = string;

export interface DbTransaction {
  execute(sql: string, params?: SqlParameter[]): Promise<void>;
  executeReturning<T>(sql: string, params?: SqlParameter[]): Promise<T[]>;
}

export class DbService {
  private database?: PowerSyncDatabase;
  private syncStarted = false;

  constructor(private readonly authentication: AuthenticationService = authenticationService) {}

  async initialize(): Promise<void> {
    if (this.database) return;

    this.database = new PowerSyncDatabase({
      schema: AppSchema,
      database: {
        dbFilename: path.join(app.getPath('userData'), 'ai-chat-powersync.sqlite'),
      },
    });

    if (this.authentication.hasSession()) await this.connect();
  }

  async connect(): Promise<void> {
    if (!this.database) throw new Error('PowerSync database has not been initialized.');
    if (this.syncStarted) return;

    this.syncStarted = true;
    const connector = new PowerSyncConnector(this.authentication);
    void this.database.connect(connector).catch((error) => {
      this.syncStarted = false;
      console.error('PowerSync connection failed; continuing with local data.', error);
    });

    const firstSyncTimeout = new AbortController();
    const timeout = setTimeout(() => firstSyncTimeout.abort(), 15_000);
    try {
      await this.database.waitForFirstSync(firstSyncTimeout.signal);
    } catch {
      console.warn('PowerSync first sync was not available; starting in offline mode.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.database) return;
    await this.database.disconnect();
    this.syncStarted = false;
  }

  async clearLocalData(): Promise<void> {
    if (!this.database) return;
    await this.database.disconnectAndClear();
    this.syncStarted = false;
  }

  async close(): Promise<void> {
    if (!this.database) return;
    await this.database.close();
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

  private getDatabase(): PowerSyncDatabase {
    if (!this.database) throw new Error('PowerSync database has not been initialized.');
    return this.database;
  }
}

export const dbService = new DbService();
