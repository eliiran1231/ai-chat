import { dbService, type DbService } from './db.service.js';

interface MessageRow {
  id: number;
  chat_id: number;
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

interface TableColumnRow {
  name: string;
}

interface AttachmentPayload {
  name: string;
  extension: string;
  type: string;
  url: string;
  size: number;
}

export interface MessagePayload {
  id?: number;
  chatId: number;
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
  id: number;
  value: string;
  time: string;
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id INTEGER NOT NULL,
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

    const messageColumns = await this.db.all<TableColumnRow>(`PRAGMA table_info(messages)`);
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
    const hasEditedAtColumn = messageColumns.some((column) => column.name === 'edited_at');
    const hasEditableColumn = messageColumns.some((column) => column.name === 'editable');
    const hasDeletableColumn = messageColumns.some((column) => column.name === 'deletable');

    if (!hasIsReadColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`);
      await this.db.run(`
        UPDATE messages
        SET is_read = CASE WHEN sender = 'user' THEN 1 ELSE 0 END
        WHERE is_read = 0
      `);
    }
    if (!hasPossibleAnswersColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN possible_answers TEXT`);
    }
    if (!hasMessageTypeColumn) {
      await this.db.run(
        `ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'message'`,
      );
      await this.db.run(`
        UPDATE messages
        SET message_type = 'question'
        WHERE possible_answers IS NOT NULL
      `);
    }
    if (!hasValidatorSpecColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN validator_spec TEXT`);
    }
    if (!hasValidationErrorMessageColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN validation_error_message TEXT`);
    }
    if (!hasAttachmentColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN attachment TEXT`);
    }
    if (!hasEditedAtColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN edited_at TEXT`);
    }
    if (!hasEditableColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN editable INTEGER NOT NULL DEFAULT 1`);
    }
    if (!hasDeletableColumn) {
      await this.db.run(`ALTER TABLE messages ADD COLUMN deletable INTEGER NOT NULL DEFAULT 1`);
    }
  }

  async getChatMessages(chatId: number) {
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
      message.editedAt ?? null,
      message.attachment ? JSON.stringify(message.attachment) : null,
      message.possibleAnswers?.length ? JSON.stringify(message.possibleAnswers) : null,
      message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
      message.validationErrorMessage ?? null,
      message.isRead ? 1 : 0,
      message.editable === false ? 0 : 1,
      message.deletable === false ? 0 : 1,
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
        `
      : `
          INSERT INTO messages (
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
    const args = persistWithExplicitId ? [explicitMessageId, ...commonArgs] : commonArgs;

    const result = await this.db.run(sql, args);
    const insertedMessageId = explicitMessageId ?? result.lastID;

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
      [insertedMessageId],
    );

    if (!row) {
      throw new Error(`Created message ${insertedMessageId} could not be loaded.`);
    }

    return this.mapMessageRow(row);
  }

  async updateMessage(message: UpdateMessagePayload): Promise<boolean> {
    const result = await this.db.run(
      `
        UPDATE messages
        SET value = ?,
            time = ?,
            edited_at = ?
        WHERE id = ? AND editable = 1
      `,
      [message.value, message.time, message.editedAt, message.id],
    );

    return result.changes > 0;
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    const result = await this.db.run(
      `
        DELETE FROM messages
        WHERE id = ? AND deletable = 1
      `,
      [messageId],
    );

    return result.changes > 0;
  }

  async markChatRead(chatId: number): Promise<boolean> {
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

export const messageService = new MessageService(dbService);
