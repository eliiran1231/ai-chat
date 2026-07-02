import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';

type Uuid = string;
type AnswerSelectionMode = 'single' | 'multiple';

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
  answer_selection_mode: string | null;
  validator_spec: string | null;
  validation_error_message: string | null;
  status: number;
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
  answerSelectionMode?: AnswerSelectionMode | null;
  validatorSpec?: unknown;
  validationErrorMessage?: string | null;
  status?: MessageStatus;
  editable?: boolean;
  deletable?: boolean;
}

export enum MessageStatus {
    Pending,
    Sent,
    Read,
    Failed
}

export interface CommitMessagePayload {
  id: Uuid;
  from?: string;
  messageType?: string;
  value: string;
  tag?: string | null;
  time: string;
  editedAt?: string | null;
  attachment?: AttachmentPayload | null;
  possibleAnswers?: string[] | null;
  answerSelectionMode?: AnswerSelectionMode | null;
  validatorSpec?: unknown;
  validationErrorMessage?: string | null;
  status: MessageStatus;
  editable: boolean;
  deletable: boolean;
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
          answer_selection_mode,
          validator_spec,
          validation_error_message,
          status,
          editable,
          deletable
        FROM messages
        WHERE chat_id = ?
        ORDER BY time ASC
      `,
      [chatId],
    );

    return rows.map((row) => this.mapMessageRow(row));
  }

  async createMessage(message: MessagePayload) {
    const messageId = message.id || randomUUID();
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
      message.answerSelectionMode ?? null,
      message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
      message.validationErrorMessage ?? null,
      message.status ?? MessageStatus.Pending,
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
            answer_selection_mode,
            validator_spec,
            validation_error_message,
            status,
            editable,
            deletable
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    await this.db.execute(sql, commonArgs);

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
          answer_selection_mode,
          validator_spec,
          validation_error_message,
          status,
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

  async commitMessage(message: CommitMessagePayload): Promise<boolean> {
    const rows = await this.db.executeReturning<{ id: Uuid }>(
      `
        UPDATE messages
        SET sender = COALESCE(?, sender),
            message_type = COALESCE(?, message_type),
            value = ?,
            tag = ?,
            time = ?,
            edited_at = ?,
            attachment = ?,
            possible_answers = ?,
            answer_selection_mode = ?,
            validator_spec = ?,
            validation_error_message = ?,
            status = ?,
            editable = ?,
            deletable = ?
        WHERE id = ?
        RETURNING id
      `,
      [
        message.from ?? null,
        message.messageType ?? null,
        message.value,
        message.tag ?? null,
        message.time,
        message.editedAt ?? null,
        message.attachment ? JSON.stringify(message.attachment) : null,
        message.possibleAnswers?.length ? JSON.stringify(message.possibleAnswers) : null,
        message.answerSelectionMode ?? null,
        message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
        message.validationErrorMessage ?? null,
        message.status,
        message.editable ? 1 : 0,
        message.deletable ? 1 : 0,
        message.id,
      ],
    );

    return rows.length > 0;
  }

  async deleteMessage(messageId: Uuid): Promise<boolean> {
    const rows = await this.db.executeReturning<{ id: Uuid }>(
      `
        DELETE FROM messages
        WHERE id = ? AND deletable = 1
        RETURNING id
      `,
      [messageId],
    );

    return rows.length > 0;
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
      status: row.status,
      editable: Boolean(row.editable),
      deletable: Boolean(row.deletable),
      attachment: this.parseAttachmentColumn(row.attachment, 'attachment', row.id),
      possibleAnswers: this.parseStringArrayColumn(
        row.possible_answers,
        'possible_answers',
        row.id,
      ),
      answerSelectionMode: this.parseAnswerSelectionMode(row.answer_selection_mode, row.id),
      validatorSpec: this.db.parseJsonColumn(row.validator_spec, 'validator_spec', row.id),
      validationErrorMessage: row.validation_error_message ?? undefined,
    };
  }

  private parseAnswerSelectionMode(
    value: string | null,
    rowId: Uuid,
  ): AnswerSelectionMode | undefined {
    if (value === 'single' || value === 'multiple') return value;
    if (!value) return undefined;

    console.warn(`Unexpected answer_selection_mode payload for message ${rowId}.`, value);
    return undefined;
  }

  private parseStringArrayColumn(
    value: string | null,
    fieldName: string,
    rowId: Uuid,
  ): string[] | undefined {
    const parsedValue = this.db.parseJsonColumn(value, fieldName, rowId);
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
    const parsedValue = this.db.parseJsonColumn(value, fieldName, rowId);
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
