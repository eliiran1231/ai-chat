import { inject, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import {
  FILE_CHANNELS,
  type DeleteFileRequest,
  type ListedChatFile,
  type SavedChatFile,
  type SaveChatFileRequest,
} from '../../shared/files/ChatFile';

export type { SavedChatFile } from '../../shared/files/ChatFile';

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  private readonly electronService = inject(ElectronService);

  async saveAttachment(file: File, chatId: string): Promise<SavedChatFile> {
    const request: SaveChatFileRequest = {
      chatId,
      name: file.name,
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    };
    return this.electronService.invoke<SavedChatFile>(FILE_CHANNELS.save, request);
  }

  async deleteAttachment(chatId: string, fileName: string): Promise<void> {
    const request: DeleteFileRequest = { chatId, fileName };
    return this.electronService.invoke<void>(FILE_CHANNELS.delete, request);
  }

  async listAttachments(chatId: string): Promise<ListedChatFile[]> {
    return this.electronService.invoke<ListedChatFile[]>(FILE_CHANNELS.list, chatId);
  }
}
