import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { ChatRecord } from '../interfaces/db/ChatRecord';
import { CreateChatRecordInput } from '../interfaces/db/CreateChatRecordInput';
import { CreateMessageRecordInput } from '../interfaces/db/CreateMessageRecordInput';
import { CreateSupporterRecordInput } from '../interfaces/db/CreateSupporterRecordInput';
import { MessageRecord } from '../interfaces/db/MessageRecord';
import { SupporterRecord } from '../interfaces/db/SupporterRecord';
import { UpdateSupporterAgentInput } from '../interfaces/db/UpdateSupporterAgentInput';
import { Uuid } from '../interfaces/db/Uuid';
import { CommitMessageInput } from '../interfaces/db/CommitMessageInput';
import { CommitChatInput } from '../interfaces/db/CommitChatInput';
import { CommitSupporterInput } from '../interfaces/db/CommitSupporter';

@Injectable({
  providedIn: 'root',
})
export class DbService {
  constructor(private electronService: ElectronService) {}

  async getChats(): Promise<ChatRecord[]> {
    if (!this.electronService.isElectronAvailable()) {
      return [];
    }

    return this.electronService.invoke<ChatRecord[]>('db:getChats');
  }

  async createChat(chat: CreateChatRecordInput): Promise<ChatRecord> {
    return this.electronService.invoke<ChatRecord>('db:createChat', chat);
  }

  async deleteChat(chatId: Uuid): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:deleteChat', chatId);
  }

  async commitChat(chat: CommitChatInput): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:commitChat', chat);
  }

  async getChatMessages(chatId: Uuid): Promise<MessageRecord[]> {
    return this.electronService.invoke<MessageRecord[]>('db:getChatMessages', chatId);
  }

  async createMessage(message: CreateMessageRecordInput): Promise<MessageRecord> {
    return this.electronService.invoke<MessageRecord>('db:createMessage', message);
  }

  async commitMessage(message: CommitMessageInput){
    return this.electronService.invoke<boolean>('db:commitMessage', message)
  }

  async deleteMessage(messageId: Uuid): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:deleteMessage', messageId);
  }

  async getChatSupporter(chatId: Uuid): Promise<SupporterRecord | null> {
    return this.electronService.invoke<SupporterRecord | null>('db:getChatSupporter', chatId);
  }

  async createSupporter(supporter: CreateSupporterRecordInput): Promise<SupporterRecord> {
    return this.electronService.invoke<SupporterRecord>('db:createSupporter', supporter);
  }

  async updateSupporterAgent(input: UpdateSupporterAgentInput): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:updateSupporterAgent', input);
  }

  async commitSupporter(supporter: CommitSupporterInput): Promise<boolean> {
    const payload: any = {
      id: supporter.id,
      name: supporter.name ?? undefined,
      expects: supporter.expects ?? undefined,
      context: supporter.context ?? '',
    };
    try {
      payload.context = JSON.stringify(payload.context);
    } catch {
      payload.context = String(payload.context);
    }
    return this.electronService.invoke<boolean>('db:commitSupporter', payload as any);
  }
}
