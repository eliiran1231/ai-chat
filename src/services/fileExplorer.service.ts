import { inject, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { FILE_CHANNELS, MAX_CHAT_FILE_BYTES, type ReadChatFileResult, type SavedChatFile } from '../../shared/files/ChatFile';

export type { SavedChatFile } from '../../shared/files/ChatFile';

@Injectable({ providedIn: 'root' })
export class FileExplorerService {
  private readonly electronService = inject(ElectronService);
  private readonly pendingDeletes = new Map<string, { chatId: string; fileId: string }>();

  async saveFile(chatId: string, file: File): Promise<SavedChatFile> {
    if (file.size > MAX_CHAT_FILE_BYTES) throw new Error('Attachments must be 25 MB or smaller.');
    // A DOM File cannot cross Electron IPC. Send its bytes and plain metadata instead.
    const bytes = new Uint8Array(await file.arrayBuffer());
    return this.electronService.invoke<SavedChatFile>(FILE_CHANNELS.save, {
      chatId, name: file.name, type: file.type, bytes,
    });
  }

  async listFiles(chatId: string): Promise<SavedChatFile[]> {
    for (const file of [...this.pendingDeletes.values()]) {
      if (file.chatId === chatId) await this.deleteFile(file.chatId, file.fileId);
    }
    return this.electronService.invoke<SavedChatFile[]>(FILE_CHANNELS.list, { chatId });
  }

  readFile(chatId: string, fileId: string): Promise<ReadChatFileResult> {
    return this.electronService.invoke<ReadChatFileResult>(FILE_CHANNELS.read, { chatId, fileId });
  }

  async getFile(chatId: string, fileId: string): Promise<File> {
    const { file, bytes } = await this.readFile(chatId, fileId);
    return new File([new Uint8Array(bytes)], file.name, { type: file.type });
  }

  async deleteFile(chatId: string, fileId: string): Promise<void> {
    const key = JSON.stringify([chatId, fileId]);
    this.pendingDeletes.set(key, { chatId, fileId });
    await this.electronService.invoke<void>(FILE_CHANNELS.delete, { chatId, fileId });
    this.pendingDeletes.delete(key);
  }
}
