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

async function initializeDatabase() {
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
