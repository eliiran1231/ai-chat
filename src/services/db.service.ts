import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { ChatRecord } from '../interfaces/db/ChatRecord';
import { CreateChatRecordInput } from '../interfaces/db/CreateChatRecordInput';
import { CreateMessageRecordInput } from '../interfaces/db/CreateMessageRecordInput';
import { CreateSupporterRecordInput } from '../interfaces/db/CreateSupporterRecordInput';
import { MessageRecord } from '../interfaces/db/MessageRecord';
import { SupporterRecord } from '../interfaces/db/SupporterRecord';
import { UpdateChatTitleInput } from '../interfaces/db/UpdateChatTitleInput';
import { UpdateSupporterAgentInput } from '../interfaces/db/UpdateSupporterAgentInput';
import { UpdateSupporterContextInput } from '../interfaces/db/UpdateSupporterContextInput';

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

  async deleteChat(chatId: number): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:deleteChat', chatId);
  }

  async getChatMessages(chatId: number): Promise<MessageRecord[]> {
    return this.electronService.invoke<MessageRecord[]>('db:getChatMessages', chatId);
  }

  async createMessage(message: CreateMessageRecordInput): Promise<MessageRecord> {
    return this.electronService.invoke<MessageRecord>('db:createMessage', message);
  }

  async getChatSupporter(chatId: number): Promise<SupporterRecord | null> {
    return this.electronService.invoke<SupporterRecord | null>('db:getChatSupporter', chatId);
  }

  async createSupporter(supporter: CreateSupporterRecordInput): Promise<SupporterRecord> {
    return this.electronService.invoke<SupporterRecord>('db:createSupporter', supporter);
  }

  async markChatRead(chatId: number): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:markChatRead', chatId);
  }

  async updateChatTitle(input: UpdateChatTitleInput): Promise<ChatRecord> {
    return this.electronService.invoke<ChatRecord>('db:updateChatTitle', input);
  }

  async updateSupporterAgent(input: UpdateSupporterAgentInput): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:updateSupporterAgent', input);
  }

  async updateSupporterContext(input: UpdateSupporterContextInput): Promise<boolean> {
    try{
      input.context = JSON.stringify(input.context);
    }
    catch{
      input.context = input.context.toString();
    }
    return this.electronService.invoke<boolean>('db:updateSupporterContext', input);
  }
}
