// Standalone Node 22+ runner: no npm packages or development Electron required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFileSync } = require('node:child_process');
const { once } = require('node:events');

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function connect(port, processHandle) {
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw new Error(`Installed app exited: ${processHandle.exitCode}`);
    try {
      const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) })).json();
      const page = pages.find(page => page.type === 'page' && page.url.includes('index.html'));
      if (page) {
        const socket = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
          socket.addEventListener('open', resolve, { once: true });
          socket.addEventListener('error', reject, { once: true });
        });
        let id = 0;
        const pending = new Map();
        socket.addEventListener('message', event => {
          const message = JSON.parse(event.data);
          const waiter = pending.get(message.id);
          if (!waiter) return;
          pending.delete(message.id);
          message.error ? waiter.reject(new Error(JSON.stringify(message.error))) : waiter.resolve(message.result);
        });
        socket.addEventListener('close', () => {
          for (const waiter of pending.values()) waiter.reject(new Error('Debug connection closed'));
          pending.clear();
        });
        return {
          close: () => socket.close(),
          async evaluate(expression) {
            const requestId = ++id;
            let timer;
            const result = await new Promise((resolve, reject) => {
              timer = setTimeout(() => { pending.delete(requestId); reject(new Error('Renderer command timed out')); }, 15_000);
              pending.set(requestId, { resolve, reject });
              socket.send(JSON.stringify({ id: requestId, method: 'Runtime.evaluate', params: {
                expression, awaitPromise: true, returnByValue: true, userGesture: true,
              } }));
            }).finally(() => clearTimeout(timer));
            if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
            return result.result.value;
          },
        };
      }
    } catch (error) {
      if (processHandle.exitCode !== null) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Installed app never exposed a renderer');
}

async function main() {
  const [executable, output] = process.argv.slice(2);
  assert(executable && output, 'Usage: node test-installed-app.cjs <installed-exe> <report.json>');
  assert.equal(process.platform, 'win32');
  const checks = [];
  let child;
  let connection;
  let primaryError;
  const invoke = (channel, payload) => connection.evaluate(`window.electronAPI.invoke(${JSON.stringify(channel)}, ${JSON.stringify(payload) ?? 'undefined'})`);
  async function launch() {
    const port = await unusedPort();
    const { ELECTRON_RUN_AS_NODE, NODE_OPTIONS, NODE_PATH, ...env } = process.env;
    child = spawn(path.resolve(executable), [`--remote-debugging-port=${port}`, '--disable-gpu'], {
      cwd: path.dirname(path.resolve(executable)), env, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', data => { stderr = (stderr + data).slice(-20_000); });
    child.on('error', error => { stderr += error.message; });
    try { connection = await connect(port, child); }
    catch (error) { throw new Error(`${error.message}\n${stderr}`); }
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await connection.evaluate("typeof window.electronAPI?.invoke === 'function' && !!document.querySelector('app-root')?.innerText.trim()")) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Installed renderer/preload did not become ready');
  }
  async function stop() {
    if (!child || child.exitCode !== null) return;
    await invoke('settings:updateGeneral', { runInBackground: false });
    const exited = once(child, 'exit');
    await connection.evaluate('window.close()').catch(() => {});
    let timer;
    await Promise.race([exited, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Installed app did not quit normally')), 10_000);
    })]).finally(() => clearTimeout(timer));
    connection.close();
    connection = null;
  }
  try {
    await launch();
    checks.push('actual installed executable starts with renderer and preload');
    const chat = await invoke('db:createChat', { name: 'Installed MSI persistence test', status: 'active', avatar: { type: 'text', value: 'CI' } });
    assert((await invoke('db:getChats')).some(row => row.id === chat.id));
    const message = await invoke('db:createMessage', { chatId: chat.id, value: 'Survives process restart', time: new Date().toISOString(), from: { type: 'client' } });
    // Prove the running process uses the MSI's DLL, even on a hosted runner with global VC runtimes.
    const loaded = execFileSync('powershell.exe', ['-NoProfile', '-Command',
      `(Get-Process -Id ${child.pid}).Modules | Where-Object { $_.ModuleName -ieq 'vcruntime140.dll' } | ForEach-Object { $_.FileName }`,
    ], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/).filter(Boolean);
    const expected = path.join(path.dirname(path.resolve(executable)), 'vcruntime140.dll');
    assert(loaded.some(file => file.toLowerCase() === expected.toLowerCase()), `App-local runtime not loaded: ${JSON.stringify(loaded)}`);
    checks.push('SQLite writes work; actual process loaded MSI-local VCRUNTIME140.dll');
    await stop();
    await launch();
    assert((await invoke('db:getChats')).some(row => row.id === chat.id));
    assert((await invoke('db:getChatMessages', { chatId: chat.id, offset: 0, limit: 10 })).some(row => row.id === message.id));
    checks.push('chat and message survive a normal shutdown and new process');
    assert((await invoke('languages:list')).some(language => language.code === 'en'));
    await connection.evaluate("document.querySelector('app-sidebar-menu .app-menu__trigger').click()");
    await new Promise(resolve => setTimeout(resolve, 300));
    await connection.evaluate("document.querySelector('.app-menu__item').click()");
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.match(await connection.evaluate('location.href'), /index\.html#\/settings/);
    await connection.evaluate('location.reload()').catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 1000));
    assert(await connection.evaluate("!!document.querySelector('app-settings-layout')?.innerText.trim()"));
    checks.push('packaged languages, settings UI navigation and reload');
    await invoke('db:deleteChat', chat.id);
    await stop();
  } catch (error) { primaryError = error; }
  finally {
    connection?.close();
    if (child && child.exitCode === null && child.pid) {
      try { execFileSync('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' }); }
      catch (error) { primaryError ||= error; }
    }
    fs.writeFileSync(output, JSON.stringify({ ok: !primaryError, executable: path.resolve(executable), checks, error: primaryError?.stack }, null, 2));
  }
  if (primaryError) throw primaryError;
  console.log(checks.join('\n'));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
