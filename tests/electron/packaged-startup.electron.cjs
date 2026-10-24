const { app, BrowserWindow, safeStorage } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const [archive, resultPath] = process.argv.slice(-2);
const failures = [];
const checks = [];
let temporary;
let window;
let database;
let phase = 'startup';
let loginEnabled = false;
// Do not alter the developer's Windows startup registration during a smoke test.
app.setLoginItemSettings = options => { loginEnabled = options.openAtLogin; };
app.getLoginItemSettings = () => ({ openAtLogin: loginEnabled });
Object.defineProperty(app, 'isPackaged', { value: true });
Object.defineProperty(process, 'resourcesPath', { value: path.dirname(archive) });
app.setAppPath(archive);
app.disableHardwareAcceleration();
const watchdog = setTimeout(() => {
  require('node:fs').writeFileSync(resultPath, JSON.stringify({ error: `Timed out during ${phase}`, failures, checks }));
  app.exit(2);
}, 45_000);

const importApp = relative => import(pathToFileURL(path.join(archive, relative)).href);
const evaluate = code => window.webContents.executeJavaScript(code, true);
const invoke = (channel, payload) => evaluate(`window.electronAPI.invoke(${JSON.stringify(channel)}, ${JSON.stringify(payload) ?? 'undefined'})`);
async function until(expression) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Renderer did not become ready: ${expression}`);
}

async function run() {
  temporary = await fs.mkdtemp(path.join(path.dirname(resultPath), 'startup-user-data-'));
  app.setPath('userData', temporary);
  // A different working directory catches accidental dependencies on the source tree.
  process.chdir(temporary);
  const loaded = new Promise((resolve, reject) => app.once('browser-window-created', (_event, win) => {
    window = win;
    win.hide();
    win.webContents.on('preload-error', (_event, _file, error) => failures.push(String(error)));
    win.webContents.on('console-message', (_event, details) => {
      if (details.level === 'error') failures.push(details.message);
    });
    win.webContents.on('render-process-gone', (_event, details) => failures.push(`Renderer exited: ${details.reason}`));
    win.webContents.once('did-fail-load', (_event, code, description) => reject(new Error(`Load failed: ${code} ${description}`)));
    win.webContents.once('did-finish-load', resolve);
  }));
  await importApp('main.js');
  await loaded;
  database = (await importApp('services/db.service.js')).dbService;
  await until("document.querySelector('app-root')?.innerText.trim().length > 0 && typeof window.electronAPI?.invoke === 'function'");
  assert.deepEqual(failures, [], 'Renderer startup errors');
  checks.push('real main process startup, renderer assets, preload, tray');

  phase = 'IPC';
  assert.equal(await invoke('system:getAppVersion'), app.getVersion());
  assert.equal((await invoke('auth:getCurrentUser')), null);
  const languages = await invoke('languages:list');
  assert(languages.some(language => language.code === 'en'));
  assert(Object.keys((await invoke('languages:get', 'en')).strings).length > 0);
  checks.push('version, authentication status, packaged language files');
  const chat = await invoke('db:createChat', { name: 'MSI smoke test', status: 'active', avatar: { type: 'text', value: 'OK' } });
  assert((await invoke('db:getChats')).some(row => row.id === chat.id));
  const message = await invoke('db:createMessage', { chatId: chat.id, value: 'Packaged message', time: new Date().toISOString(), from: { type: 'client' } });
  assert((await invoke('db:getChatMessages', { chatId: chat.id, offset: 0, limit: 10 })).some(row => row.id === message.id));
  await invoke('db:deleteMessage', message.id);
  await invoke('db:deleteChat', chat.id);
  assert(!(await invoke('db:getChats')).some(row => row.id === chat.id));
  checks.push('chat/message create, read, delete over the real preload IPC bridge');

  await invoke('settings:updateGeneral', { runInBackground: false });
  assert.equal(JSON.parse(await fs.readFile(path.join(temporary, 'settings.json'), 'utf8')).runInBackground, false);
  assert.equal((await invoke('settings:getGeneral')).runInBackground, false);
  assert(safeStorage.isEncryptionAvailable(), 'Windows secure storage unavailable');
  assert.equal(safeStorage.decryptString(safeStorage.encryptString('smoke-test-token')), 'smoke-test-token');
  checks.push('settings persistence in userData, Windows secure storage');

  phase = 'route refresh';
  await evaluate("document.querySelector('app-sidebar-menu .app-menu__trigger').click()");
  await until("document.querySelector('.app-menu__item') !== null");
  await evaluate("document.querySelector('.app-menu__item').click()");
  await until("location.href.includes('settings')");
  const reload = new Promise((resolve, reject) => {
    window.webContents.once('did-finish-load', resolve);
    window.webContents.once('did-fail-load', (_event, code, description, url) => reject(new Error(`Route reload failed: ${code} ${description} (${url})`)));
  });
  window.webContents.reload();
  await reload;
  await until("document.querySelector('app-root')?.innerText.trim().length > 0");
  assert.deepEqual(failures, [], 'Renderer errors');
  checks.push('settings navigation and page reload');
}

(async () => {
  let error;
  try { await run(); } catch (caught) { error = caught; }
  await fs.writeFile(resultPath, JSON.stringify({ ok: !error, phase, checks, failures, error: error?.stack }, null, 2));
  try {
    for (const win of BrowserWindow.getAllWindows()) win.destroy();
    await database?.close();
  } finally {
    clearTimeout(watchdog);
    // Chromium can keep its session files open until process exit; retain this isolated test profile.
    app.exit(error ? 1 : 0);
  }
})();
