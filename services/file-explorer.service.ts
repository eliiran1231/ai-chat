import type { Dirent } from 'node:fs';
import { mkdir, readdir, rm, rmdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ListedChatFile } from '../shared/files/ChatFile.js';

/** Main-process storage, independent of message persistence and the preview lifecycle. */
export class FileExplorerService {
  constructor() {}

  async saveFile(endPath: string, name: string, bytes: Uint8Array): Promise<void> {
    if (
      typeof name !== 'string' ||
      !name ||
      name.length > 255 ||
      /[\u0000-\u001f/\\]/.test(name) ||
      !(bytes instanceof Uint8Array)
    ) 
      throw new Error('Invalid attachment or attachment exceeds the 25 MB limit.');

    const buffer = Buffer.from(bytes);
    try {
      await this.createDirectoies(endPath); // after the files has been created: 'RootOfProject\attachments\ownerId, 'chat-' + chatId + '-files', 'ready' \.writing-' + directoryId
      await writeFile(path.join(endPath, name), buffer, { flag: 'wx' });
    } catch (error) {
      throw new Error('directories and files didnt created');
    }
  }

  private async createDirectoies(endPath: string): Promise<void> {
    try {
      await mkdir(endPath, {
        recursive: true,
      });
    } catch (error) {
      const alreadyExists = error instanceof Error && 'code' in error && error.code === 'EEXIST';
      if (!alreadyExists) {
        throw error;
      }
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    await rm(filePath, { force: true });
    try {
      await rmdir(path.dirname(filePath));
    } catch (error) {
      if (!(error instanceof Error && 'code' in error &&
          (error.code === 'ENOENT' || error.code === 'ENOTEMPTY'))) throw error;
    }
  }

  async listFiles(baseChatDirectoryFiles: string): Promise<ListedChatFile[]> {
    let directories: Dirent[];
    try {
      directories = await readdir(baseChatDirectoryFiles, {
        withFileTypes: true,
      });
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    const files: ListedChatFile[] = [];
    for (const directory of directories) {
      if (!directory.isDirectory()) continue;
      const directoryPath = path.join(baseChatDirectoryFiles, directory.name);
      const entries = await readdir(directoryPath, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        files.push({
          fileDirectoryId: directory.name,
          directoryPath,
          filePath: path.join(directoryPath, entry.name),
          name: entry.name,
        });
      }
    }
    return files;
  }
}

export const fileExplorerService = new FileExplorerService();
