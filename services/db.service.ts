import { app } from 'electron';
import * as path from 'path';
import sqlite3 from 'sqlite3';

export type SqlParameter = string | number | null;
export type RunResult = { lastID: number; changes: number };

const sqlite = sqlite3.verbose();
type Uuid = string;

export class DbService {
  private database?: sqlite3.Database;

  close(): void {
    this.database?.close();
    this.database = undefined;
  }

  public parseJsonColumn(value: string | null, fieldName: string, rowId: Uuid) {
    if (!value) {
      return undefined;
    }

    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn(`Failed to parse ${fieldName} for message ${rowId}.`, error);
      return undefined;
    }
  }

  run(sql: string, params: SqlParameter[] = []): Promise<RunResult> {
    return new Promise((resolve, reject) => {
      this.getDatabase().run(
        sql,
        params,
        function onRun(this: sqlite3.RunResult, error: Error | null) {
          if (error) {
            reject(error);
            return;
          }

          resolve({ lastID: this.lastID, changes: this.changes });
        },
      );
    });
  }

  all<T>(sql: string, params: SqlParameter[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.getDatabase().all<T>(sql, params, (error: Error | null, rows: T[]) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(rows);
      });
    });
  }

  get<T>(sql: string, params: SqlParameter[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      this.getDatabase().get<T>(sql, params, (error: Error | null, row: T | undefined) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row);
      });
    });
  }

  private getDatabase(): sqlite3.Database {
    if (!this.database) {
      const databasePath = path.join(app.getPath('userData'), 'ai-chat.sqlite');
      this.database = new sqlite.Database(databasePath);
    }

    return this.database;
  }
}

export const dbService = new DbService();
