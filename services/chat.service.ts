import { dbService, type DbService } from './db.service.js';
import { randomUUID } from 'crypto';

type Uuid = string;

interface ChatRow {
  id: Uuid;
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

export interface ChatPayload {
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

export interface UpdateChatTitlePayload {
  chatId: Uuid;
  name: string;
}



export class ChatService {
  constructor(private readonly db: DbService) {}

  async initialize(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
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
  }

  async getChats() {
    const rows = await this.db.all<ChatRow>(`
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

    return rows.map((row) => this.mapChatRow(row));
  }

  async createChat(chat: ChatPayload) {
    const now = new Date().toISOString();
    const chatId = randomUUID();
    await this.db.run(
      `
        INSERT INTO chats (
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
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        chatId,
        chat.name,
        chat.status,
        JSON.stringify(chat.avatar),
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

    const row = await this.db.get<ChatRow>(
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
      throw new Error(`Created chat ${chatId} could not be loaded.`);
    }

    return this.mapChatRow(row);
  }

  public parseAvatarColumn(value : string | null, rowId: Uuid) {
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

  async updateChatAvatar(chatId: any, avatar: any) {
    const now = new Date().toISOString();
    await this.db.run(
      `
        UPDATE chats
        SET avatar = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [JSON.stringify(avatar), now, chatId],
    );

    const  row = await this.db.get<ChatRow>(
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
      throw new Error(`Updated avatar for chat ${chatId} could not be loaded.`);
    }

    return this.mapChatRow(row);
  }
  
  async updateChatTitle({ chatId, name }: UpdateChatTitlePayload) {
    const now = new Date().toISOString();
    await this.db.run(
      `
        UPDATE chats
        SET name = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [name, now, chatId],
    );

    const row = await this.db.get<ChatRow>(
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

  async deleteChat(chatId: Uuid): Promise<boolean> {
    await this.db.run(`DELETE FROM messages WHERE chat_id = ?`, [chatId]);
    await this.db.run(`DELETE FROM supporters WHERE chat_id = ?`, [chatId]);
    const result = await this.db.run(`DELETE FROM chats WHERE id = ?`, [chatId]);
    return result.changes > 0;
  }

  private mapChatRow(row: ChatRow) {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      avatar: this.parseAvatarColumn(row.avatar, row.id),
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
}

export const chatService = new ChatService(dbService);
