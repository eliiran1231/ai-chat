import { app, BrowserWindow, Menu, ipcMain, shell} from 'electron/main';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { exec } from 'child_process';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlite = sqlite3.verbose();

let database;
let mainWindow;

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

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addrs = interfaces[name];
    if (!addrs) continue;

    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return '127.0.0.1';
}

function getFullName() {
  return new Promise((resolve) => {
    const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-LocalUser -Name $env:USERNAME).FullName"`;

    exec(command, { encoding: "utf8" }, (err, out) => {
      if (err) return resolve(null);
      resolve(out.trim());
    });
  });
}

async function getBasicInfo() {
  const userInfo = os.userInfo();
  const username = userInfo.username || process.env.USERNAME || process.env.USER || 'unknown';
  const displayName = await getFullName() || username;
  const computerName = os.hostname();

  return {
    username,
    displayName,
    computerName,
    ip: getNetworkIp(),
  };
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

function parseJsonColumn(value, fieldName, rowId) {
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

function parseStringArrayColumn(value, fieldName, rowId) {
  const parsedValue = parseJsonColumn(value, fieldName, rowId);
  if (parsedValue === undefined) {
    return undefined;
  }

  if (Array.isArray(parsedValue) && parsedValue.every((item) => typeof item === 'string')) {
    return parsedValue;
  }

  console.warn(`Unexpected ${fieldName} payload for message ${rowId}.`, parsedValue);
  return undefined;
}

function mapMessageRow(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    from: row.sender,
    messageType: row.message_type ?? 'message',
    value: row.value,
    tag: row.tag ?? undefined,
    time: row.time,
    isRead: Boolean(row.is_read),
    possibleAnswers: parseStringArrayColumn(row.possible_answers, 'possible_answers', row.id),
    validatorSpec: parseJsonColumn(row.validator_spec, 'validator_spec', row.id),
    validationErrorMessage: row.validation_error_message ?? undefined,
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
      message_type TEXT NOT NULL DEFAULT 'message',
      value TEXT NOT NULL,
      tag TEXT,
      time TEXT NOT NULL,
      possible_answers TEXT,
      validator_spec TEXT,
      validation_error_message TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
    )
  `);

  const messageColumns = await all(`PRAGMA table_info(messages)`);
  const hasIsReadColumn = messageColumns.some((column) => column.name === 'is_read');
  const hasPossibleAnswersColumn = messageColumns.some(
    (column) => column.name === 'possible_answers',
  );
  const hasMessageTypeColumn = messageColumns.some((column) => column.name === 'message_type');
  const hasValidatorSpecColumn = messageColumns.some((column) => column.name === 'validator_spec');
  const hasValidationErrorMessageColumn = messageColumns.some(
    (column) => column.name === 'validation_error_message',
  );
  if (!hasIsReadColumn) {
    await run(`ALTER TABLE messages ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`);
    await run(`
      UPDATE messages
      SET is_read = CASE WHEN sender = 'user' THEN 1 ELSE 0 END
      WHERE is_read = 0
    `);
  }
  if (!hasPossibleAnswersColumn) {
    await run(`ALTER TABLE messages ADD COLUMN possible_answers TEXT`);
  }
  if (!hasMessageTypeColumn) {
    await run(`ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'message'`);
    await run(`
      UPDATE messages
      SET message_type = 'question'
      WHERE possible_answers IS NOT NULL
    `);
  }
  if (!hasValidatorSpecColumn) {
    await run(`ALTER TABLE messages ADD COLUMN validator_spec TEXT`);
  }
  if (!hasValidationErrorMessageColumn) {
    await run(`ALTER TABLE messages ADD COLUMN validation_error_message TEXT`);
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
        SELECT
          id,
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
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

    return rows.map(mapMessageRow);
  });

  ipcMain.handle('db:createMessage', async (_event, message) => {
    const result = await run(
      `
        INSERT INTO messages (
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
          possible_answers,
          validator_spec,
          validation_error_message,
          is_read
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        message.chatId,
        message.from,
        message.messageType ?? 'message',
        message.value,
        message.tag ?? null,
        message.time,
        message.possibleAnswers?.length ? JSON.stringify(message.possibleAnswers) : null,
        message.validatorSpec ? JSON.stringify(message.validatorSpec) : null,
        message.validationErrorMessage ?? null,
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
        SELECT
          id,
          chat_id,
          sender,
          message_type,
          value,
          tag,
          time,
          possible_answers,
          validator_spec,
          validation_error_message,
          is_read
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

  ipcMain.handle('db:updateChatTitle', async (_event, { chatId, name }) => {
    const now = new Date().toISOString();
    await run(
      `
        UPDATE chats
        SET name = ?,
            updated_at = ?
        WHERE id = ?
      `,
      [name, now, chatId],
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
      [chatId],
    );

    return mapChatRow(row);
  });

  ipcMain.handle('db:deleteChat', async (_event, chatId) => {
    await run(`DELETE FROM messages WHERE chat_id = ?`, [chatId]);
    const result = await run(`DELETE FROM chats WHERE id = ?`, [chatId]);
    return result.changes > 0;
  });

  ipcMain.handle('system:getBasicInfo', async () => {
    return getBasicInfo();
  });
}

function isExternalUrl(url) {
  return /^https?:\/\//i.test(url);
}

function sendFullscreenState() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('window:fullscreen-changed', mainWindow.isFullScreen());
}

function toggleFullscreen() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  const nextFullscreenState = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(nextFullscreenState);
  sendFullscreenState();
  return nextFullscreenState;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 680,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.on('enter-full-screen', sendFullscreenState);
  mainWindow.on('leave-full-screen', sendFullscreenState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      toggleFullscreen();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalUrl(url)) {
      void shell.openExternal(url);
      return { action: 'deny' };
    }
      return { action: 'allow' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL();

    if (url !== currentUrl && isExternalUrl(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  mainWindow.loadFile(path.join(__dirname, './dist/ai-chat/browser/index.html'));
}

app.whenReady().then(async () => {
  await initializeDatabase();
  registerDbHandlers();
  ipcMain.handle('window:toggle-fullscreen', () => toggleFullscreen());
  ipcMain.handle('window:is-fullscreen', () => mainWindow?.isFullScreen() ?? false);
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
