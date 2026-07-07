import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';
import { desc, eq } from 'drizzle-orm';
import { chats, messages, supporters, type ChatRow } from './drizzle-schema.js';

type Uuid = string;

interface AvatarPayload {
  type: 'image' | 'text';
  value: string;
}

export interface ChatPayload {
  name: string;
  status: string;
  avatar: AvatarPayload;
  subtitle?: string | null;
  timeLabel?: string | null;
  unreadCount?: number | null;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string | null;
}

export interface CommitChatPayload {
  id: Uuid;
  name: string;
  status: string;
  avatar: AvatarPayload;
  subtitle?: string | null;
  timeLabel?: string | null;
  unreadCount: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string | null;
}

export class ChatService {
  constructor(private readonly db: DbService) {}

  async getChats() {
    const rows = await this.db.orm.select().from(chats).orderBy(desc(chats.id));

    return rows.map((row) => this.mapChatRow(row));
  }

  async createChat(chat: ChatPayload) {
    const now = new Date().toISOString();
    const chatId = randomUUID();
    const [row] = await this.db.orm
      .insert(chats)
      .values({
        id: chatId,
        name: chat.name,
        status: chat.status,
        avatar: JSON.stringify(chat.avatar),
        subtitle: chat.subtitle ?? null,
        timeLabel: chat.timeLabel ?? null,
        unreadCount: chat.unreadCount ?? 0,
        highlightTime: chat.highlightTime ? 1 : 0,
        avatarRing: chat.avatarRing ? 1 : 0,
        tipLabel: chat.tipLabel ?? null,
        ownerUserId: null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!row) {
      throw new Error(`Created chat ${chatId} could not be loaded.`);
    }

    return this.mapChatRow(row);
  }

  async commitChat(chat: CommitChatPayload): Promise<boolean> {
    const now = new Date().toISOString();
    const rows = await this.db.orm
      .update(chats)
      .set({
        name: chat.name,
        status: chat.status,
        avatar: JSON.stringify(chat.avatar),
        subtitle: chat.subtitle ?? null,
        timeLabel: chat.timeLabel ?? null,
        unreadCount: chat.unreadCount,
        highlightTime: chat.highlightTime ? 1 : 0,
        avatarRing: chat.avatarRing ? 1 : 0,
        tipLabel: chat.tipLabel ?? null,
        updatedAt: now,
      })
      .where(eq(chats.id, chat.id))
      .returning({ id: chats.id });

    return rows.length > 0;
  }

  public parseAvatarColumn(value: string | null, rowId: Uuid) {
    const parsedValue = this.db.parseJsonColumn(value, 'avatar', rowId);
    if (parsedValue === undefined) {
      return value;
    }

    if (
      parsedValue &&
      typeof parsedValue === 'object' &&
      typeof parsedValue.type === 'string' &&
      typeof parsedValue.value === 'string'
    ) {
      return parsedValue;
    }

    console.warn(`Unexpected avatar payload for chat ${rowId}.`, parsedValue);
    return value;
  }

  async deleteChat(chatId: Uuid): Promise<boolean> {
    return this.db.orm.transaction(async (transaction) => {
      await transaction.delete(messages).where(eq(messages.chatId, chatId));
      await transaction.delete(supporters).where(eq(supporters.chatId, chatId));
      const rows = await transaction
        .delete(chats)
        .where(eq(chats.id, chatId))
        .returning({ id: chats.id });
      return rows.length > 0;
    });
  }

  private mapChatRow(row: ChatRow) {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      avatar: this.parseAvatarColumn(row.avatar, row.id),
      subtitle: row.subtitle ?? undefined,
      timeLabel: row.timeLabel ?? undefined,
      unreadCount: row.unreadCount ?? undefined,
      highlightTime: Boolean(row.highlightTime),
      avatarRing: Boolean(row.avatarRing),
      tipLabel: row.tipLabel ?? undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const chatService = new ChatService(dbService);
