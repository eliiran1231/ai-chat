import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { messages, type MessageRow } from './drizzle-schema.js';

type Uuid = string;
type AnswerSelectionMode = 'single' | 'multiple';

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

  async getChatMessages(chatId: Uuid, offset: number, limit: number) {
    const rows = await this.db.orm
      .select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(desc(messages.time), desc(messages.id))
      .limit(limit)
      .offset(offset);

    return rows.reverse().map((row) => this.mapMessageRow(row));
  }

  async createMessage(message: MessagePayload) {
    const messageId = message.id || randomUUID();
    const [row] = await this.db.orm
      .insert(messages)
      .values({
        id: messageId,
        chatId: message.chatId,
        sender: message.from ?? 'client',
        messageType: message.messageType ?? 'message',
        value: message.value,
        tag: message.tag ?? null,
        time: message.time,
        editedAt: message.editedAt ?? null,
        attachment: message.attachment ? JSON.stringify(message.attachment) : null,
        possibleAnswers: message.possibleAnswers?.length
          ? JSON.stringify(message.possibleAnswers)
          : null,
        answerSelectionMode: message.answerSelectionMode ?? null,
        validatorSpec: message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
        validationErrorMessage: message.validationErrorMessage ?? null,
        status: message.status ?? MessageStatus.Pending,
        editable: message.editable === false ? 0 : 1,
        deletable: message.deletable === false ? 0 : 1,
      })
      .returning();

    if (!row) {
      throw new Error(`Created message ${messageId} could not be loaded.`);
    }

    return this.mapMessageRow(row);
  }

  async commitMessage(message: CommitMessagePayload): Promise<boolean> {
    const rows = await this.db.orm
      .update(messages)
      .set({
        ...(message.from === undefined ? {} : { sender: message.from }),
        ...(message.messageType === undefined ? {} : { messageType: message.messageType }),
        value: message.value,
        tag: message.tag ?? null,
        time: message.time,
        editedAt: message.editedAt ?? null,
        attachment: message.attachment ? JSON.stringify(message.attachment) : null,
        possibleAnswers: message.possibleAnswers?.length
          ? JSON.stringify(message.possibleAnswers)
          : null,
        answerSelectionMode: message.answerSelectionMode ?? null,
        validatorSpec: message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
        validationErrorMessage: message.validationErrorMessage ?? null,
        status: message.status,
        editable: message.editable ? 1 : 0,
        deletable: message.deletable ? 1 : 0,
      })
      .where(eq(messages.id, message.id))
      .returning({ id: messages.id });

    return rows.length > 0;
  }

  async deleteMessage(messageId: Uuid): Promise<boolean> {
    const rows = await this.db.orm
      .delete(messages)
      .where(and(eq(messages.id, messageId), eq(messages.deletable, 1)))
      .returning({ id: messages.id });

    return rows.length > 0;
  }

  private mapMessageRow(row: MessageRow) {
    return {
      id: row.id,
      chatId: row.chatId,
      from: row.sender,
      messageType: row.messageType ?? 'message',
      value: row.value,
      tag: row.tag ?? undefined,
      time: row.time,
      editedAt: row.editedAt ?? undefined,
      status: row.status,
      editable: Boolean(row.editable),
      deletable: Boolean(row.deletable),
      attachment: this.parseAttachmentColumn(row.attachment, 'attachment', row.id),
      possibleAnswers: this.parseStringArrayColumn(
        row.possibleAnswers,
        'possible_answers',
        row.id,
      ),
      answerSelectionMode: this.parseAnswerSelectionMode(row.answerSelectionMode, row.id),
      validatorSpec: this.db.parseJsonColumn(row.validatorSpec, 'validator_spec', row.id),
      validationErrorMessage: row.validationErrorMessage ?? undefined,
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
