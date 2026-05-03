import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { dbService, type DbService } from './db.service.js';

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

interface UpdateChatTitlePayload {
  chatId: number;
  name: string;
}

export class ChatService {
  constructor(private readonly db: DbService) {}

  async initialize(): Promise<void> {
    await this.db.run(`
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
  }

  registerHandlers(): void {
    ipcMain.handle('db:getChats', async () => this.getChats());
    ipcMain.handle('db:createChat', async (_event: IpcMainInvokeEvent, chat: ChatPayload) =>
      this.createChat(chat),
    );
    ipcMain.handle(
      'db:updateChatTitle',
      async (_event: IpcMainInvokeEvent, payload: UpdateChatTitlePayload) =>
        this.updateChatTitle(payload),
    );
    ipcMain.handle('db:deleteChat', async (_event: IpcMainInvokeEvent, chatId: number) =>
      this.deleteChat(chatId),
    );
  }

  private async getChats() {
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

    return rows.map(this.mapChatRow);
  }

  private async createChat(chat: ChatPayload) {
    const now = new Date().toISOString();
    const result = await this.db.run(
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
      [result.lastID],
    );

    if (!row) {
      throw new Error(`Created chat ${result.lastID} could not be loaded.`);
    }

    return this.mapChatRow(row);
  }

  private async updateChatTitle({ chatId, name }: UpdateChatTitlePayload) {
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

  private async deleteChat(chatId: number): Promise<boolean> {
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
}

export const chatService = new ChatService(dbService);
