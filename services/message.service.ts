import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';

type Uuid = string;

interface MessageRow {
  id: Uuid;
  chat_id: Uuid;
  sender: string;
  message_type: string | null;
  value: string;
  tag: string | null;
  time: string;
  edited_at: string | null;
  attachment: string | null;
  possible_answers: string | null;
  validator_spec: string | null;
  validation_error_message: string | null;
  is_read: number;
  editable: number;
  deletable: number;
}

interface AttachmentPayload {
  name: string;
  extension: string;
  type: string;
  url: string;
  size: number;
}

export interface MessagePayload {
  id?: Uuid;
  chatId: Uuid;
  from: string;
  messageType?: string;
  value: string;
  tag?: string | null;
  time: string;
  editedAt?: string | null;
  attachment?: AttachmentPayload | null;
  possibleAnswers?: string[] | null;
  validatorSpec?: unknown;
  validationErrorMessage?: string | null;
  isRead?: boolean;
  editable?: boolean;
  deletable?: boolean;
}

export interface UpdateMessagePayload {
  id: Uuid;
  value: string;
  editedAt: string;
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

export class MessageService {
  constructor(private readonly db: DbService) {}

  async initialize(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'message',
        value TEXT NOT NULL,
        tag TEXT,
        time TEXT NOT NULL,
        edited_at TEXT,
        attachment TEXT,
        possible_answers TEXT,
        validator_spec TEXT,
        validation_error_message TEXT,
        is_read INTEGER NOT NULL DEFAULT 0,
        editable INTEGER NOT NULL DEFAULT 1,
        deletable INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      )
    `);
  }

  async getChatMessages(chatId: Uuid) {
    const rows = await this.db.all<MessageRow>(
      `
        SELECT
          id,
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
          edited_at,
          attachment,
          possible_answers,
          validator_spec,
          validation_error_message,
          is_read,
          editable,
          deletable
        FROM messages
        WHERE chat_id = ?
        ORDER BY time ASC, id ASC
      `,
      [chatId],
    );

    return rows.map((row) => this.mapMessageRow(row));
  }

  async createMessage(message: MessagePayload) {
    const messageId = message.id ?? randomUUID();
    const commonArgs = [
      messageId,
      message.chatId,
      message.from ?? 'client',
      message.messageType ?? 'message',
      message.value,
      message.tag ?? null,
      message.time,
      message.editedAt ?? null,
      message.attachment ? JSON.stringify(message.attachment) : null,
      message.possibleAnswers?.length ? JSON.stringify(message.possibleAnswers) : null,
      message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
      message.validationErrorMessage ?? null,
      message.isRead ? 1 : 0,
      message.editable === false ? 0 : 1,
      message.deletable === false ? 0 : 1,
    ];

    const sql = `
          INSERT INTO messages (
            id,
            chat_id,
            sender,
            message_type,
            value,
            tag,
            time,
            edited_at,
            attachment,
            possible_answers,
            validator_spec,
            validation_error_message,
            is_read,
            editable,
            deletable
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    await this.db.run(sql, commonArgs);

    if (!message.isRead) {
      await this.db.run(
        `
          UPDATE chats
          SET unread_count = unread_count + 1,
              updated_at = ?
          WHERE id = ?
        `,
        [new Date().toISOString(), message.chatId],
      );
    }

    const row = await this.db.get<MessageRow>(
      `
        SELECT
          id,
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
          edited_at,
          attachment,
          possible_answers,
          validator_spec,
          validation_error_message,
          is_read,
          editable,
          deletable
        FROM messages
        WHERE id = ?
      `,
      [messageId],
    );

    if (!row) {
      throw new Error(`Created message ${messageId} could not be loaded.`);
    }

    return this.mapMessageRow(row);
  }

  async updateMessage(message: UpdateMessagePayload): Promise<boolean> {
    const result = await this.db.run(
      `
        UPDATE messages
        SET value = ?,
            edited_at = ?
        WHERE id = ? AND editable = 1
      `,
      [message.value, message.editedAt, message.id],
    );

    return result.changes > 0;
  }

  async deleteMessage(messageId: Uuid): Promise<boolean> {
    const result = await this.db.run(
      `
        DELETE FROM messages
        WHERE id = ? AND deletable = 1
      `,
      [messageId],
    );

    return result.changes > 0;
  }

  async markChatRead(chatId: Uuid): Promise<boolean> {
    const now = new Date().toISOString();
    await this.db.run(
      `
        UPDATE messages
        SET is_read = 1
        WHERE chat_id = ? AND is_read = 0
      `,
      [chatId],
    );

    const result = await this.db.run(
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

  private mapMessageRow(row: MessageRow) {
    return {
      id: row.id,
      chatId: row.chat_id,
      from: row.sender,
      messageType: row.message_type ?? 'message',
      value: row.value,
      tag: row.tag ?? undefined,
      time: row.time,
      editedAt: row.edited_at ?? undefined,
      isRead: Boolean(row.is_read),
      editable: Boolean(row.editable),
      deletable: Boolean(row.deletable),
      attachment: this.parseAttachmentColumn(row.attachment, 'attachment', row.id),
      possibleAnswers: this.parseStringArrayColumn(row.possible_answers, 'possible_answers', row.id),
      validatorSpec: this.parseJsonColumn(row.validator_spec, 'validator_spec', row.id),
      validationErrorMessage: row.validation_error_message ?? undefined,
    };
  }

  private parseJsonColumn(value: string | null, fieldName: string, rowId: Uuid): unknown {
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
    rowId: Uuid,
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
    rowId: Uuid,
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

export const messageService = new MessageService(dbService);
