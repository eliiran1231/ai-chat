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

  readonly attacmentsFolder = "attachments";
  readonly root = path.join(app.getPath('userData'), this.attacmentsFolder)

  async saveAttachment(chatId: string, name: string, bytes: Uint8Array): Promise<void> {
    return fileExplorerService.saveFile(
        path.join(this.root, this.attacmentsFolder, chatId),
        name,
        bytes
    )
  }

  async deleteAttachment(chatId: string, name: string): Promise<void> {
    return fileExplorerService.deleteFile(path.join(this.root, this.attacmentsFolder, chatId))
  }
  
  async listAttachments(chatId: string): Promise<ListedChatFile[]> {
    return fileExplorerService.listFiles(path.join(this.root, this.attacmentsFolder, chatId))
  }
}

export const attachmentService = new AttachmentService();
