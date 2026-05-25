import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';

type Uuid = string;

interface SupporterRow {
  id: Uuid;
  chat_id: Uuid;
  agent_name: string;
  context: string | null;
  created_at: string;
  updated_at: string;
}

interface TableColumnRow {
  name: string;
}

export interface SupporterPayload {
  chatId: Uuid;
  agentName: string;
  context?: string | null;
}

export interface UpdateSupporterAgentPayload {
  chatId: Uuid;
  agentName: string;
}

export interface UpdateSupporterContextPayload {
  chatId: Uuid;
  context?: string | null;
}

export class SupporterService {
  constructor(private readonly db: DbService) {}

  async initialize(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS supporters (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL UNIQUE,
        agent_name TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);

    const supporterColumns = await this.db.all<TableColumnRow>(`PRAGMA table_info(supporters)`);
    if (supporterColumns.length > 0) {
      const hasContextColumn = supporterColumns.some((column) => column.name === 'context');
      if (!hasContextColumn) {
        await this.db.run(`ALTER TABLE supporters ADD COLUMN context TEXT NOT NULL DEFAULT ''`);
      }
    }
  }

  async getChatSupporter(chatId: Uuid) {
    const row = await this.db.get<SupporterRow>(
      `
        SELECT
          id,
          chat_id,
          agent_name,
          context,
          created_at,
          updated_at
        FROM supporters
        WHERE chat_id = ?
      `,
      [chatId],
    );

    return this.mapSupporterRow(row);
  }

  async createSupporter(supporter: SupporterPayload) {
    const now = new Date().toISOString();
    const supporterId = randomUUID();
    await this.db.run(
      `
        INSERT INTO supporters (
          id,
          chat_id,
          agent_name,
          context,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [supporterId, supporter.chatId, supporter.agentName, supporter.context ?? '', now, now],
    );

    const row = await this.db.get<SupporterRow>(
      `
        SELECT
          id,
          chat_id,
          agent_name,
          context,
          created_at,
          updated_at
        FROM supporters
        WHERE id = ?
      `,
      [supporterId],
    );

    if (!row) {
      throw new Error(`Created supporter ${supporterId} could not be loaded.`);
    }

    return this.mapSupporterRow(row);
  }

  async updateSupporterAgent({
    chatId,
    agentName,
  }: UpdateSupporterAgentPayload): Promise<boolean> {
    const result = await this.db.run(
      `
        UPDATE supporters
        SET agent_name = ?,
            updated_at = ?
        WHERE chat_id = ?
      `,
      [agentName, new Date().toISOString(), chatId],
    );

    return result.changes > 0;
  }

  async updateSupporterContext({
    chatId,
    context,
  }: UpdateSupporterContextPayload): Promise<boolean> {
    const result = await this.db.run(
      `
        UPDATE supporters
        SET context = ?,
            updated_at = ?
        WHERE chat_id = ?
      `,
      [context ?? '', new Date().toISOString(), chatId],
    );

    return result.changes > 0;
  }

  private mapSupporterRow(row: SupporterRow | undefined) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      chatId: row.chat_id,
      agentName: row.agent_name,
      context: row.context ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const supporterService = new SupporterService(dbService);
