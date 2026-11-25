import { inject, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import {
  chatFileData,
  DeleteFileRequest,
  FILE_CHANNELS,
  ListedChatFile,
  MAX_CHAT_FILE_BYTES,
  SaveChatFileRequest,
  type ReadChatFileResult,
  type SavedChatFile,
} from '../../shared/files/ChatFile';

export type { SavedChatFile } from '../../shared/files/ChatFile';

@Injectable({ providedIn: 'root' })
export class FileExplorerService {
  createEndFileDirectory(arg0: string) {
    throw new Error('Method not implemented.');
  }
  private readonly electronService = inject(ElectronService);
  private readonly pendingDeletes = new Map<string, { chatId: string; fileId: string }>();

  async getRootOfProject() {
    return this.electronService.invoke<string>('rootPath');
  }

  async getOwnerFromAuthService() {
    return this.electronService.invoke<string>('ownerId');
  }

  async baseChatDirectoryFiles(chatId: string) {
    const rootPath = await this.getRootOfProject();
    const ownerId = await this.getOwnerFromAuthService();
    const endPathToSaveFile = `${rootPath}\\attachments\\${ownerId}\\chat-${chatId}-files`;
    return endPathToSaveFile;
  }

  async createDirectoryPathToSaveFile(chatId: string): Promise<string> {
    const baseChatDirectoryFiles = await this.baseChatDirectoryFiles(chatId);
    const randomId = crypto.randomUUID();
    return `${baseChatDirectoryFiles}\\${randomId}`;
  }

  async saveFile(file: File, endPathToSaveFile: string): Promise<chatFileData> {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return this.electronService.invoke<chatFileData>(FILE_CHANNELS.save, {
      endPath: endPathToSaveFile,
      name: file.name,
      type: file.type,
      bytes,
    });
  }

  async deleteFile(filePath: string): Promise<void> {
    return this.electronService.invoke<void>(FILE_CHANNELS.delete, filePath);
  }

  async listFiles(baseChatDirectoryFiles: string): Promise<ListedChatFile[]> {
    return this.electronService.invoke(FILE_CHANNELS.list, baseChatDirectoryFiles);
  }
}
