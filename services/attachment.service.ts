import type { Dirent } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  chatFileData,
  ListedChatFile,
  SaveChatFileRequest,
} from '../shared/files/ChatFile.js';
import { app } from 'electron';
import { fileExplorerService } from './file-explorer.service.js';
import { randomUUID } from 'node:crypto';

export class AttachmentService {
  constructor() {}

  readonly attacmentsFolder = 'attachments';
  readonly root = path.join(app.getPath('userData'));

  async saveAttachment(chatId: string, name: string, bytes: Uint8Array): Promise<string> {
    const attachmentDirectoryId = randomUUID();
    const attachmentPath = path.join(
      this.root,
      this.attacmentsFolder,
      chatId,
      attachmentDirectoryId,
    );
    await fileExplorerService.saveFile(attachmentPath, name, bytes);
    return attachmentPath;
  }

  async deleteAttachment(chatId: string, attachmentId: string): Promise<void> {
    const attachmentsDirectory = path.resolve(this.root, this.attacmentsFolder);
    const chatDirectory = path.resolve(attachmentsDirectory, chatId);
    const attachmentPath = path.resolve(chatDirectory, attachmentId);
    if (
      path.dirname(chatDirectory) !== attachmentsDirectory ||
      path.dirname(attachmentPath) !== chatDirectory
    ) {
      throw new Error('Invalid attachment path.');
    }
    await rm(attachmentPath, { recursive: true, force: true });
  }

  async listAttachments(chatId: string): Promise<ListedChatFile[]> {
    return fileExplorerService.listFiles(path.join(this.root, this.attacmentsFolder, chatId));
  }
}

export const attachmentService = new AttachmentService();
