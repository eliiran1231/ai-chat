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

export class AttachmentService {
  constructor() {}

  readonly attacmentsFolder = 'attachments';
  readonly root = path.join(app.getPath('userData'));

  async saveAttachment(chatId: string, name: string, bytes: Uint8Array): Promise<string> {
    const attachmentPath = path.join(this.root, this.attacmentsFolder, chatId);
    await fileExplorerService.saveFile(attachmentPath, name, bytes);
    return path.join(attachmentPath, name);
  }

  async deleteAttachment(chatId: string, fileName: string): Promise<void> {
    return fileExplorerService.deleteFile(
      path.join(this.root, this.attacmentsFolder, chatId, fileName),
    );
  }

  async listAttachments(chatId: string): Promise<ListedChatFile[]> {
    return fileExplorerService.listFiles(path.join(this.root, this.attacmentsFolder, chatId));
  }
}

export const attachmentService = new AttachmentService();
