import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { FileExplorerService } from '../../services/file-explorer.service.ts';
import { MAX_CHAT_FILE_BYTES } from '../../shared/files/ChatFile.ts';

describe('Local chat file storage', () => {
  let temporary: string;
  let root: string;
  let service: FileExplorerService;
  const owner = 'user-a';
  const request = (overrides = {}) => ({
    chatId: 'chat-a', name: 'photo.png', type: 'image/png',
    bytes: new Uint8Array([0, 1, 127, 255]), ...overrides,
  });

  beforeEach(async () => {
    temporary = await mkdtemp(path.join(tmpdir(), 'ai-chat-files-test-'));
    root = path.join(temporary, 'attachments');
    service = new FileExplorerService(() => root);
  });

  afterEach(async () => {
    expect(path.dirname(temporary)).toBe(path.resolve(tmpdir()));
    expect(path.basename(temporary)).toMatch(/^ai-chat-files-test-/);
    await rm(temporary, { recursive: true, force: true });
  });

  it('saves binary content and reads it after recreating the service', async () => {
    const saved = await service.saveFile(owner, request());
    expect(saved).toMatchObject({ chatId: 'chat-a', name: 'photo.png', size: 4 });
    expect(path.isAbsolute(saved.pathFile)).toBe(true);
    expect(new Uint8Array(await readFile(saved.pathFile))).toEqual(request().bytes);
    // Older saved files may omit pathFile and contain lifecycle fields; they still remain readable.
    await writeFile(path.join(root, owner, 'chat-chat-a-files', 'ready', saved.id, 'metadata.json'),
      JSON.stringify({ ...saved, pathFile: undefined, state: 'ready', messageId: 'message-a', digest: 'old-digest' }));
    service = new FileExplorerService(() => root);
    expect(await service.listFiles(owner, 'chat-a')).toEqual([saved]);
    expect(await service.readFile(owner, 'chat-a', saved.id)).toEqual({ file: saved, bytes: request().bytes });
    expect(await readdir(path.join(root, owner, 'chat-chat-a-files', 'ready'))).toEqual([saved.id]);
  });

  it('keeps separate files with the same name, including concurrent saves', async () => {
    const [first, second] = await Promise.all([
      service.saveFile(owner, request()),
      service.saveFile(owner, request({ bytes: new Uint8Array([7]) })),
    ]);
    expect(first.id).not.toBe(second.id);
    expect(await service.listFiles(owner, 'chat-a')).toHaveLength(2);
    expect((await service.readFile(owner, 'chat-a', first.id)).bytes).toEqual(request().bytes);
    expect((await service.readFile(owner, 'chat-a', second.id)).bytes).toEqual(new Uint8Array([7]));
  });

  it('isolates users and chats and deletes only the saved copy', async () => {
    const original = path.join(temporary, 'original.png');
    await writeFile(original, request().bytes);
    const saved = await service.saveFile(owner, request());
    expect(await service.listFiles('user-b', 'chat-a')).toEqual([]);
    expect(await service.listFiles(owner, 'chat-b')).toEqual([]);
    await expect(service.readFile('user-b', 'chat-a', saved.id)).rejects.toThrow('not available');
    await service.deleteFile(owner, 'chat-a', saved.id);
    await service.deleteFile(owner, 'chat-a', saved.id);
    expect(await service.listFiles(owner, 'chat-a')).toEqual([]);
    expect(new Uint8Array(await readFile(original))).toEqual(request().bytes);
  });

  it('rejects traversal, invalid metadata, and oversized or non-byte payloads', async () => {
    for (const chatId of ['../outside', 'C:\\outside', 'CON', 'a/b', '']) {
      await expect(service.saveFile(owner, request({ chatId }))).rejects.toThrow();
    }
    await expect(service.saveFile('../outside', request())).rejects.toThrow();
    await expect(service.deleteFile(owner, 'chat-a', '../outside')).rejects.toThrow();
    await expect(service.saveFile(owner, request({ name: '../outside.png' }))).rejects.toThrow();
    await expect(service.saveFile(owner, request({ bytes: new Uint8Array(MAX_CHAT_FILE_BYTES + 1) }))).rejects.toThrow();
    await expect(service.saveFile(owner, request({ bytes: 'abc' }))).rejects.toThrow();
  });

  it('reports missing/damaged content instead of returning an incomplete file', async () => {
    const saved = await service.saveFile(owner, request());
    await writeFile(path.join(root, owner, 'chat-chat-a-files', 'ready', saved.id, 'content'), 'damaged');
    await expect(service.readFile(owner, 'chat-a', saved.id)).rejects.toThrow('damaged');
  });

  it('refuses a directory junction that points outside attachment storage', async () => {
    await service.saveFile(owner, request());
    const outside = path.join(temporary, 'outside');
    await mkdir(outside);
    await writeFile(path.join(outside, 'keep.txt'), 'keep');
    await symlink(outside, path.join(root, owner, 'chat-escape-files'), 'junction');
    await expect(service.saveFile(owner, request({ chatId: 'escape' }))).rejects.toThrow('Unsafe');
    await expect(service.deleteFile(owner, 'escape', 'file-a')).rejects.toThrow('Unsafe');
    expect(await readFile(path.join(outside, 'keep.txt'), 'utf8')).toBe('keep');
  });
});
