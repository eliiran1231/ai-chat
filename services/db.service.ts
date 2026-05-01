import { app, ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import * as path from 'path';
import sqlite3 from 'sqlite3';

type SqlParameter = string | number | null;
type RunResult = { lastID: number; changes: number };

interface TableColumnRow {
  name: string;
}

interface ChatRow {
  id: number;
  name: string;
  status: string;
  avatar: string;
  subtitle: string | null;
  time_label: string | null;
  unread_count: number | null;
  highlight_time: number;
  avatar_ring: number;
  tip_label: string | null;
  created_at: string;
  updated_at: string;
}

interface SupporterRow {
  id: number;
  chat_id: number;
  agent_name: string;
  context: string | null;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: number;
  chat_id: number;
  sender: string;
  message_type: string | null;
  value: string;
  tag: string | null;
  time: string;
  attachment: string | null;
  possible_answers: string | null;
  validator_spec: string | null;
  validation_error_message: string | null;
  is_read: number;
}

interface AttachmentPayload {
  name: string;
  extension: string;
  type: string;
  url: string;
  size: number;
}

interface ChatPayload {
  name: string;
  status: string;
  avatar: string;
  subtitle?: string | null;
  timeLabel?: string | null;
  unreadCount?: number | null;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string | null;
}

interface SupporterPayload {
  chatId: number;
  agentName: string;
  context?: string | null;
}

interface MessagePayload {
  id?: number;
  chatId: number;
  from: string;
  messageType?: string;
  value: string;
  tag?: string | null;
  time: string;
  attachment?: AttachmentPayload | null;
  possibleAnswers?: string[] | null;
  validatorSpec?: unknown;
  validationErrorMessage?: string | null;
  isRead?: boolean;
}

interface UpdateChatTitlePayload {
  chatId: number;
  name: string;
}

interface UpdateSupporterAgentPayload {
  chatId: number;
  agentName: string;
}

interface UpdateSupporterContextPayload {
  chatId: number;
  context?: string | null;
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isAttachmentPayload(value: unknown): value is AttachmentPayload {
  return (
    isJsonObject(value) &&
    typeof value['name'] === 'string' &&
    typeof value['extension'] === 'string' &&
    typeof value['type'] === 'string' &&
    typeof value['url'] === 'string' &&
    typeof value['size'] === 'number'
  );
}

const sqlite = sqlite3.verbose();

export class DbService {
  private database?: sqlite3.Database;

  async initialize(): Promise<void> {
    await this.run(`PRAGMA foreign_keys = ON`);
    await this.run(`
      CREATE TABLE IF NOT EXISTS chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        avatar TEXT NOT NULL,
        subtitle TEXT,
        time_label TEXT,
        unread_count INTEGER DEFAULT 0,
        highlight_time INTEGER DEFAULT 0,
        avatar_ring INTEGER DEFAULT 0,
        tip_label TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    await this.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
        sender TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'message',
        value TEXT NOT NULL,
        tag TEXT,
        time TEXT NOT NULL,
        attachment TEXT,
        possible_answers TEXT,
        validator_spec TEXT,
        validation_error_message TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);
    await this.run(`
      CREATE TABLE IF NOT EXISTS supporters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL UNIQUE,
        agent_name TEXT NOT NULL,
        context TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);

    const messageColumns = await this.all<TableColumnRow>(`PRAGMA table_info(messages)`);
    const supporterColumns = await this.all<TableColumnRow>(`PRAGMA table_info(supporters)`);
    const hasIsReadColumn = messageColumns.some((column) => column.name === 'is_read');
    const hasPossibleAnswersColumn = messageColumns.some(
      (column) => column.name === 'possible_answers',
    );
    const hasMessageTypeColumn = messageColumns.some((column) => column.name === 'message_type');
    const hasValidatorSpecColumn = messageColumns.some(
      (column) => column.name === 'validator_spec',
    );
    const hasValidationErrorMessageColumn = messageColumns.some(
      (column) => column.name === 'validation_error_message',
    );
    const hasAttachmentColumn = messageColumns.some((column) => column.name === 'attachment');

    if (!hasIsReadColumn) {
      await this.run(`ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`);
      await this.run(`
        UPDATE messages
        SET is_read = CASE WHEN sender = 'user' THEN 1 ELSE 0 END
        WHERE is_read = 0
      `);
    }
    if (!hasPossibleAnswersColumn) {
      await this.run(`ALTER TABLE messages ADD COLUMN possible_answers TEXT`);
    }
    if (!hasMessageTypeColumn) {
      await this.run(`ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'message'`);
      await this.run(`
        UPDATE messages
        SET message_type = 'question'
        WHERE possible_answers IS NOT NULL
      `);
    }
    if (!hasValidatorSpecColumn) {
      await this.run(`ALTER TABLE messages ADD COLUMN validator_spec TEXT`);
    }
    if (!hasValidationErrorMessageColumn) {
      await this.run(`ALTER TABLE messages ADD COLUMN validation_error_message TEXT`);
    }
    if (!hasAttachmentColumn) {
      await this.run(`ALTER TABLE messages ADD COLUMN attachment TEXT`);
    }
    if (supporterColumns.length > 0) {
      const hasContextColumn = supporterColumns.some((column) => column.name === 'context');
      if (!hasContextColumn) {
        await this.run(`ALTER TABLE supporters ADD COLUMN context TEXT NOT NULL DEFAULT ''`);
      }
    }
  }

  close(): void {
    this.database?.close();
    this.database = undefined;
  }

  registerHandlers(): void {
    ipcMain.handle('db:getChats', async () => this.getChats());
    ipcMain.handle('db:createChat', async (_event: IpcMainInvokeEvent, chat: ChatPayload) =>
      this.createChat(chat),
    );
    ipcMain.handle('db:getChatSupporter', async (_event: IpcMainInvokeEvent, chatId: number) =>
      this.getChatSupporter(chatId),
    );
    ipcMain.handle(
      'db:createSupporter',
      async (_event: IpcMainInvokeEvent, supporter: SupporterPayload) =>
        this.createSupporter(supporter),
    );
    ipcMain.handle('db:getChatMessages', async (_event: IpcMainInvokeEvent, chatId: number) =>
      this.getChatMessages(chatId),
    );
    ipcMain.handle('db:createMessage', async (_event: IpcMainInvokeEvent, message: MessagePayload) =>
      this.createMessage(message),
    );
    ipcMain.handle('db:markChatRead', async (_event: IpcMainInvokeEvent, chatId: number) =>
      this.markChatRead(chatId),
    );
    ipcMain.handle(
      'db:updateChatTitle',
      async (_event: IpcMainInvokeEvent, payload: UpdateChatTitlePayload) =>
        this.updateChatTitle(payload),
    );
    ipcMain.handle(
      'db:updateSupporterAgent',
      async (_event: IpcMainInvokeEvent, payload: UpdateSupporterAgentPayload) =>
        this.updateSupporterAgent(payload),
    );
    ipcMain.handle(
      'db:updateSupporterContext',
      async (_event: IpcMainInvokeEvent, payload: UpdateSupporterContextPayload) =>
        this.updateSupporterContext(payload),
    );
    ipcMain.handle('db:deleteChat', async (_event: IpcMainInvokeEvent, chatId: number) =>
      this.deleteChat(chatId),
    );
  }

  private getDatabase(): sqlite3.Database {
    if (!this.database) {
      const databasePath = path.join(app.getPath('userData'), 'ai-chat.sqlite');
      this.database = new sqlite.Database(databasePath);
    }

    return this.database;
  }

  private run(sql: string, params: SqlParameter[] = []): Promise<RunResult> {
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

  private all<T>(sql: string, params: SqlParameter[] = []): Promise<T[]> {
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

  private get<T>(sql: string, params: SqlParameter[] = []): Promise<T | undefined> {
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

  private async getChats() {
    const rows = await this.all<ChatRow>(`
      SELECT
        id,
        name,
        status,
        avatar,
        subtitle,
        time_label,
        unread_count,
        highlight_time,
        avatar_ring,
        tip_label,
        created_at,
        updated_at
      FROM chats
      ORDER BY id DESC
    `);

    return rows.map(this.mapChatRow);
  }

  private async createChat(chat: ChatPayload) {
    const now = new Date().toISOString();
    const result = await this.run(
      `
        INSERT INTO chats (
          name,
          status,
          avatar,
          subtitle,
          time_label,
          unread_count,
          highlight_time,
          avatar_ring,
          tip_label,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        chat.name,
        chat.status,
        chat.avatar,
        chat.subtitle ?? null,
        chat.timeLabel ?? null,
        chat.unreadCount ?? 0,
        chat.highlightTime ? 1 : 0,
        chat.avatarRing ? 1 : 0,
        chat.tipLabel ?? null,
        now,
        now,
      ],
    );

    const row = await this.get<ChatRow>(
      `
        SELECT
          id,
          name,
          status,
          avatar,
          subtitle,
          time_label,
          unread_count,
          highlight_time,
          avatar_ring,
          tip_label,
          created_at,
          updated_at
        FROM chats
        WHERE id = ?
      `,
      [result.lastID],
    );

    if (!row) {
      throw new Error(`Created chat ${result.lastID} could not be loaded.`);
    }

    return this.mapChatRow(row);
  }

  private async getChatSupporter(chatId: number) {
    const row = await this.get<SupporterRow>(
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

  private async createSupporter(supporter: SupporterPayload) {
    const now = new Date().toISOString();
    const result = await this.run(
      `
        INSERT INTO supporters (
          chat_id,
          agent_name,
          context,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [supporter.chatId, supporter.agentName, supporter.context ?? '', now, now],
    );

    const row = await this.get<SupporterRow>(
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
      [result.lastID],
    );

    if (!row) {
      throw new Error(`Created supporter ${result.lastID} could not be loaded.`);
    }

    return this.mapSupporterRow(row);
  }

  private async getChatMessages(chatId: number) {
    const rows = await this.all<MessageRow>(
      `
        SELECT
          id,
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
          attachment,
          possible_answers,
          validator_spec,
          validation_error_message,
          is_read
        FROM messages
        WHERE chat_id = ?
        ORDER BY time ASC, id ASC
      `,
      [chatId],
    );

    return rows.map((row) => this.mapMessageRow(row));
  }

  private async createMessage(message: MessagePayload) {
    const explicitMessageId =
      typeof message.id === 'number' && Number.isInteger(message.id) && message.id > 0
        ? message.id
        : undefined;
    const persistWithExplicitId = explicitMessageId !== undefined;
    const commonArgs = [
      message.chatId,
      message.from,
      message.messageType ?? 'message',
      message.value,
      message.tag ?? null,
      message.time,
      message.attachment ? JSON.stringify(message.attachment) : null,
      message.possibleAnswers?.length ? JSON.stringify(message.possibleAnswers) : null,
      message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
      message.validationErrorMessage ?? null,
      message.isRead ? 1 : 0,
    ];

    const sql = persistWithExplicitId
      ? `
          INSERT INTO messages (
            id,
            chat_id,
            sender,
            message_type,
            value,
            tag,
            time,
            attachment,
            possible_answers,
            validator_spec,
            validation_error_message,
            is_read
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      : `
          INSERT INTO messages (
            chat_id,
            sender,
            message_type,
            value,
            tag,
            time,
            attachment,
            possible_answers,
            validator_spec,
            validation_error_message,
            is_read
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    const args = persistWithExplicitId ? [explicitMessageId, ...commonArgs] : commonArgs;

    const result = await this.run(sql, args);
    const insertedMessageId = explicitMessageId ?? result.lastID;

    if (!message.isRead) {
      await this.run(
        `
          UPDATE chats
          SET unread_count = unread_count + 1,
              updated_at = ?
          WHERE id = ?
        `,
        [new Date().toISOString(), message.chatId],
      );
    }

    const row = await this.get<MessageRow>(
      `
        SELECT
          id,
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
          attachment,
          possible_answers,
          validator_spec,
          validation_error_message,
          is_read
        FROM messages
        WHERE id = ?
      `,
      [insertedMessageId],
    );

    if (!row) {
      throw new Error(`Created message ${insertedMessageId} could not be loaded.`);
    }

    return this.mapMessageRow(row);
  }

  private async markChatRead(chatId: number): Promise<boolean> {
    const now = new Date().toISOString();
    await this.run(
      `
        UPDATE messages
        SET is_read = 1
        WHERE chat_id = ? AND is_read = 0
      `,
      [chatId],
    );

    const result = await this.run(
      `
        UPDATE chats
        SET unread_count = 0,
            updated_at = ?
        WHERE id = ?
      `,
      [now, chatId],
    );

    return result.changes > 0;
  }

  private async updateChatTitle({ chatId, name }: UpdateChatTitlePayload) {
    const now = new Date().toISOString();
    await this.run(
      `
        UPDATE chats
        SET name = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [name, now, chatId],
    );

    const row = await this.get<ChatRow>(
      `
        SELECT
          id,
          name,
          status,
          avatar,
          subtitle,
          time_label,
          unread_count,
          highlight_time,
          avatar_ring,
          tip_label,
          created_at,
          updated_at
        FROM chats
        WHERE id = ?
      `,
      [chatId],
    );

    if (!row) {
      throw new Error(`Updated chat ${chatId} could not be loaded.`);
    }

    return this.mapChatRow(row);
  }

  private async updateSupporterAgent({
    chatId,
    agentName,
  }: UpdateSupporterAgentPayload): Promise<boolean> {
    const result = await this.run(
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

  private async updateSupporterContext({
    chatId,
    context,
  }: UpdateSupporterContextPayload): Promise<boolean> {
    const result = await this.run(
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

  private async deleteChat(chatId: number): Promise<boolean> {
    await this.run(`DELETE FROM messages WHERE chat_id = ?`, [chatId]);
    await this.run(`DELETE FROM supporters WHERE chat_id = ?`, [chatId]);
    const result = await this.run(`DELETE FROM chats WHERE id = ?`, [chatId]);
    return result.changes > 0;
  }

  private mapChatRow(row: ChatRow) {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      avatar: row.avatar,
      subtitle: row.subtitle ?? undefined,
      timeLabel: row.time_label ?? undefined,
      unreadCount: row.unread_count ?? undefined,
      highlightTime: Boolean(row.highlight_time),
      avatarRing: Boolean(row.avatar_ring),
      tipLabel: row.tip_label ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
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

  private mapMessageRow(row: MessageRow) {
    return {
      id: row.id,
      chatId: row.chat_id,
      from: row.sender,
      messageType: row.message_type ?? 'message',
      value: row.value,
      tag: row.tag ?? undefined,
      time: row.time,
      isRead: Boolean(row.is_read),
      attachment: this.parseAttachmentColumn(row.attachment, 'attachment', row.id),
      possibleAnswers: this.parseStringArrayColumn(row.possible_answers, 'possible_answers', row.id),
      validatorSpec: this.parseJsonColumn(row.validator_spec, 'validator_spec', row.id),
      validationErrorMessage: row.validation_error_message ?? undefined,
    };
  }

  private parseJsonColumn(value: string | null, fieldName: string, rowId: number): unknown {
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

  private parseStringArrayColumn(
    value: string | null,
    fieldName: string,
    rowId: number,
  ): string[] | undefined {
    const parsedValue = this.parseJsonColumn(value, fieldName, rowId);
    if (parsedValue === undefined) {
      return undefined;
    }

    if (Array.isArray(parsedValue) && parsedValue.every((item) => typeof item === 'string')) {
      return parsedValue;
    }

    console.warn(`Unexpected ${fieldName} payload for message ${rowId}.`, parsedValue);
    return undefined;
  }

  private parseAttachmentColumn(
    value: string | null,
    fieldName: string,
    rowId: number,
  ): AttachmentPayload | undefined {
    const parsedValue = this.parseJsonColumn(value, fieldName, rowId);
    if (parsedValue === undefined) {
      return undefined;
    }

    if (isAttachmentPayload(parsedValue)) {
      return parsedValue;
    }

    console.warn(`Unexpected ${fieldName} payload for message ${rowId}.`, parsedValue);
    return undefined;
  }
}

export const dbService = new DbService();
