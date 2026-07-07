import { execFile } from 'node:child_process';
import { readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const electronPath = require('electron') as string;
const runnerPath = fileURLToPath(new URL('./powersync-drizzle.electron.cjs', import.meta.url));

describe('Drizzle with PowerSync in Electron', () => {
  it(
    'returns, persists, paginates, and transactionally deletes service rows',
    async () => {
      const { ELECTRON_RUN_AS_NODE: _electronRunAsNode, ...env } = process.env;
      const resultPath = path.join(tmpdir(), `ai-chat-drizzle-result-${randomUUID()}.json`);
      try {
        try {
          await execFileAsync(electronPath, ['--disable-gpu', runnerPath, resultPath], {
            env,
            timeout: 30_000,
          });
        } catch (error) {
          const progress = await readFile(resultPath, 'utf8').catch(() => 'no runner progress');
          throw new Error(`${String(error)}\nRunner progress: ${progress}`);
        }
        const result = JSON.parse(await readFile(resultPath, 'utf8'));
        expect(result).toEqual({
          returning: {
            chatName: 'Drizzle chat',
            messageId: 'message-returning',
            chatRows: 1,
            messageRows: 1,
          },
          cascadeRows: { chats: 0, messages: 0, supporters: 0 },
          pages: [['message-b', 'message-c'], ['message-a']],
        });
      } finally {
        await rm(resultPath, { force: true });
      }
    },
    35_000,
  );
});
