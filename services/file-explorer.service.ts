import { randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { MAX_CHAT_FILE_BYTES, type ReadChatFileResult, type SaveChatFileRequest, type SavedChatFile } from '../shared/files/ChatFile.js';

/** Main-process storage, independent of message persistence and the preview lifecycle. */
export class FileExplorerService {
  constructor(private readonly getRoot: () => string) {}

  async saveFile(ownerId: string, request: SaveChatFileRequest): Promise<SavedChatFile> {
    const chatDir = this.chatDirectory(ownerId, request?.chatId);
    if (typeof request.name !== 'string' || !request.name || request.name.length > 255 ||
        /[\u0000-\u001f/\\]/.test(request.name) ||
        typeof request.type !== 'string' || request.type.length > 255 ||
        !(request.bytes instanceof Uint8Array) || request.bytes.byteLength > MAX_CHAT_FILE_BYTES) {
      throw new Error('Invalid attachment or attachment exceeds the 25 MB limit.');
    }
    const bytes = Buffer.from(request.bytes);
    const id = randomUUID();
    const file: SavedChatFile = {
      id, chatId: request.chatId, name: request.name, type: request.type,
      pathFile: path.join(chatDir, id, 'content'),
      size: bytes.byteLength, createdAt: new Date().toISOString(),
    };
    await this.checkDirectory(chatDir, true);
    const temporary = path.join(chatDir, '.writing-' + file.id);
    await mkdir(temporary);
    try {
      // Publish the directory only once both the bytes and metadata have been written.
      await writeFile(path.join(temporary, 'content'), bytes, { flag: 'wx' });
      await writeFile(path.join(temporary, 'metadata.json'), JSON.stringify(file), { flag: 'wx' });
      await rename(temporary, path.join(chatDir, file.id));
    } finally {
      await this.removeDirectory(temporary);
    }
    return file;
  }

  async listFiles(ownerId: string, chatId: string): Promise<SavedChatFile[]> {
    const chatDir = this.chatDirectory(ownerId, chatId);
    if (!await this.checkDirectory(chatDir)) return [];
    const files: SavedChatFile[] = [];
    for (const entry of await readdir(chatDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      this.validateId(entry.name);
      files.push(await this.metadata(chatDir, entry.name));
    }
    return files.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async readFile(ownerId: string, chatId: string, fileId: string): Promise<ReadChatFileResult> {
    this.validateId(fileId);
    const chatDir = this.chatDirectory(ownerId, chatId);
    const file = await this.metadata(chatDir, fileId);
    const bytes = await readFile(path.join(chatDir, fileId, 'content'));
    if (bytes.byteLength !== file.size) throw new Error('Attachment content is damaged.');
    return { file, bytes: new Uint8Array(bytes) };
  }

  async deleteFile(ownerId: string, chatId: string, fileId: string): Promise<void> {
    this.validateId(fileId);
    await this.removeDirectory(path.join(this.chatDirectory(ownerId, chatId), fileId));
  }

  private async metadata(chatDir: string, fileId: string): Promise<SavedChatFile> {
    const directory = path.join(chatDir, fileId);
    if (!await this.checkDirectory(directory)) throw new Error('Attachment is not available.');
    const metadataPath = path.join(directory, 'metadata.json');
    const info = await lstat(metadataPath);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 8192) throw new Error('Invalid attachment metadata.');
    const file = JSON.parse(await readFile(metadataPath, 'utf8')) as SavedChatFile;
    if (!file || file.id !== fileId || 'chat-' + file.chatId + '-files' !== path.basename(path.dirname(chatDir)) ||
        !Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_CHAT_FILE_BYTES ||
        typeof file.name !== 'string' || typeof file.type !== 'string' || typeof file.createdAt !== 'string') {
      throw new Error('Invalid attachment metadata.');
    }
    const content = await lstat(path.join(directory, 'content'));
    if (!content.isFile() || content.isSymbolicLink() || content.size !== file.size) {
      throw new Error('Attachment content is missing or damaged.');
    }
    return { id: file.id, chatId: file.chatId, pathFile: path.join(directory, 'content'), name: file.name, type: file.type, size: file.size, createdAt: file.createdAt };
  }

  private validateId(id: unknown): asserts id is string {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(id) ||
        /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(id)) throw new Error('Invalid attachment identifier.');
  }

  private chatDirectory(ownerId: string, chatId: string): string {
    this.validateId(ownerId);
    this.validateId(chatId);
    // Save directly here; keeping this location also lets us read previously saved ready files.
    return path.join(path.resolve(this.getRoot()), ownerId, 'chat-' + chatId + '-files', 'ready');
  }

  /** Reject directory junctions/symlinks and paths outside this application's storage. */
  private async checkDirectory(target: string, create = false): Promise<boolean> {
    const root = path.resolve(this.getRoot());
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Attachment path escapes storage.');
    const directories = [root];
    for (const part of relative.split(path.sep).filter(Boolean)) directories.push(path.join(directories.at(-1)!, part));
    for (const [index, directory] of directories.entries()) {
      if (create) {
        await mkdir(directory, { recursive: index === 0 }).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'EEXIST') throw error;
        });
      }
      const info = await lstat(directory).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return undefined;
        throw error;
      });
      if (!info) return false;
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Unsafe attachment directory.');
    }
    return true;
  }

  private async removeDirectory(target: string): Promise<void> {
    if (path.resolve(target) === path.resolve(this.getRoot())) throw new Error('Cannot delete attachment storage root.');
    if (await this.checkDirectory(target)) await rm(target, { recursive: true, force: true });
  }
}
