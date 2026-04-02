import { app, BrowserWindow, Menu, ipcMain } from 'electron/main';
import * as path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlite = sqlite3.verbose();

let database;

function getDatabase() {
  if (!database) {
    const databasePath = path.join(app.getPath('userData'), 'ai-chat.sqlite');
    database = new sqlite.Database(databasePath);
  }

  return database;
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

function mapChatRow(row) {
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

function mapMessageRow(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    from: row.sender,
    value: row.value,
    tag: row.tag ?? undefined,
    time: row.time,
    isRead: Boolean(row.is_read),
  };
}

async function initializeDatabase() {
  await run(`PRAGMA foreign_keys = ON`);
  await run(`
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
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL,
      sender TEXT NOT NULL,
      value TEXT NOT NULL,
      tag TEXT,
      time TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  const messageColumns = await all(`PRAGMA table_info(messages)`);
  const hasIsReadColumn = messageColumns.some((column) => column.name === 'is_read');
  if (!hasIsReadColumn) {
    await run(`ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`);
    await run(`
      UPDATE messages
      SET is_read = CASE WHEN sender = 'user' THEN 1 ELSE 0 END
      WHERE is_read = 0
    `);
  }
}

function registerDbHandlers() {
  ipcMain.handle('db:getChats', async () => {
    const rows = await all(
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
        ORDER BY id DESC
      `,
    );

    return rows.map(mapChatRow);
  });

  ipcMain.handle('db:createChat', async (_event, chat) => {
    const now = new Date().toISOString();
    const result = await run(
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

    const row = await get(
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

    return mapChatRow(row);
  });

  ipcMain.handle('db:getChatMessages', async (_event, chatId) => {
    const rows = await all(
      `
        SELECT id, chat_id, sender, value, tag, time, is_read
        FROM messages
        WHERE chat_id = ?
        ORDER BY time ASC, id ASC
      `,
      [chatId],
    );

    return rows.map(mapMessageRow);
  });

  ipcMain.handle('db:createMessage', async (_event, message) => {
    const result = await run(
      `
        INSERT INTO messages (chat_id, sender, value, tag, time, is_read)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        message.chatId,
        message.from,
        message.value,
        message.tag ?? null,
        message.time,
        message.isRead ? 1 : 0,
      ],
    );

    if (!message.isRead) {
      await run(
        `
          UPDATE chats
          SET unread_count = unread_count + 1,
              updated_at = ?
          WHERE id = ?
        `,
        [new Date().toISOString(), message.chatId],
      );
    }

    const row = await get(
      `
        SELECT id, chat_id, sender, value, tag, time, is_read
        FROM messages
        WHERE id = ?
      `,
      [result.lastID],
    );

    return mapMessageRow(row);
  });

  ipcMain.handle('db:markChatRead', async (_event, chatId) => {
    const now = new Date().toISOString();
    await run(
      `
        UPDATE messages
        SET is_read = 1
        WHERE chat_id = ? AND is_read = 0
      `,
      [chatId],
    );

    const result = await run(
      `
        UPDATE chats
        SET unread_count = 0,
            updated_at = ?
        WHERE id = ?
      `,
      [now, chatId],
    );

    return result.changes > 0;
  });

  ipcMain.handle('db:deleteChat', async (_event, chatId) => {
    await run(`DELETE FROM messages WHERE chat_id = ?`, [chatId]);
    const result = await run(`DELETE FROM chats WHERE id = ?`, [chatId]);
    return result.changes > 0;
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 360,
    height: 600,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win.loadFile(path.join(__dirname, './dist/ai-chat/browser/index.html'));
}

app.whenReady().then(async () => {
  await initializeDatabase();
  registerDbHandlers();
  //Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    database?.close();
    app.quit();
  }
});
