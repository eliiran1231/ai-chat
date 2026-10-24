const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const [archive, resultPath] = process.argv.slice(-2);
let directory;
let database;
const timeout = setTimeout(() => app.exit(2), 30_000);

async function run() {
  directory = await fs.mkdtemp(path.join(path.dirname(resultPath), 'packaged-db-'));
  app.setPath('userData', directory);
  await app.whenReady();
  const { DbService } = await import(pathToFileURL(path.join(archive, 'services/db.service.js')).href);
  const { ChatService } = await import(pathToFileURL(path.join(archive, 'services/chat.service.js')).href);
  database = new DbService({ hasSession: () => false });
  await database.initialize();
  const chats = new ChatService(database);
  assert.deepEqual(await chats.getChats(), []);
  const created = await chats.createChat({ name: 'Packaged SQLite smoke test', status: 'active', avatar: { type: 'text', value: 'OK' } });
  const rows = await chats.getChats();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, created.id);
  assert.equal(rows[0].name, 'Packaged SQLite smoke test');
  await database.close();
  database = new DbService({ hasSession: () => false });
  await database.initialize();
  const reopenedRows = await new ChatService(database).getChats();
  assert.equal(reopenedRows[0].id, created.id, 'Chats must survive a database restart');
}

(async () => {
  let error;
  try { await run(); } catch (caught) { error = caught; }
  await fs.writeFile(resultPath, JSON.stringify(error ? { error: error.stack || String(error) } : { ok: true }));
  // Failed worker initialization can leave close() pending; the timeout exits in that case.
  try { await database?.close(); } finally {
    if (directory) await fs.rm(directory, { recursive: true, force: true });
    clearTimeout(timeout);
    app.exit(error ? 1 : 0);
  }
})();
