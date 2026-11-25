import type { Dirent } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  chatFileData,
  ListedChatFile,
  SaveChatFileRequest,
} from '../shared/files/ChatFile.js';

/** Main-process storage, independent of message persistence and the preview lifecycle. */
export class FileExplorerService {
  constructor(private readonly getRoot: () => string) {}

  async saveFile(request: SaveChatFileRequest): Promise<chatFileData> {
    const endPathToSaveFile = request.endPath;
    if (
      typeof request.name !== 'string' ||
      !request.name ||
      request.name.length > 255 ||
      /[\u0000-\u001f/\\]/.test(request.name) || // למשל: שם שמכיל תו בקרה או מפריד נתיב 'hello.txt' עובר'folder/file.txt' נפסל בגלל /
      typeof request.type !== 'string' ||
      request.type.length > 255 ||
      !(request.bytes instanceof Uint8Array)
    ) {
      throw new Error('Invalid attachment or attachment exceeds the 25 MB limit.');
    }
    const bytes = Buffer.from(request.bytes); // נוצר אובייקט חדש היא מעתיקה לתוכו את ערכי הבייטים של request.bytes.
    const file: chatFileData = {
      name: request.name,
      type: request.type,
      filePath: endPathToSaveFile, //adding to chatDir , fileId, content  ''RootOfProject include 'attachments'\ownerId\chat- + chatId\files\ready\fileId\content
      size: bytes.byteLength,
      createdAt: new Date().toISOString(),
    };
    try {
      // Publish the directory only once both the bytes and metadata have been written.

      await this.createDirectoies(endPathToSaveFile); // after the files has been created: 'RootOfProject\attachments\ownerId, 'chat-' + chatId + '-files', 'ready' \.writing-' + directoryId
      await writeFile(path.join(endPathToSaveFile, request.name), bytes, { flag: 'wx' });
    } catch (error) {
      throw new Error('directories and files didnt created');
    }
    return file;
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

  async deleteFile(directpryFilePath: string): Promise<void> {
    await this.removeDirectory(directpryFilePath);
  }

  private async removeDirectory(directpryFilePath: string): Promise<void> {
    if (path.resolve(directpryFilePath) === path.resolve(this.getRoot()))
      throw new Error('Cannot delete attachment storage root.');
    else {
      await rm(directpryFilePath, { recursive: true, force: true });
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
