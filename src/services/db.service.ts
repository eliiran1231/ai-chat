import { Injectable } from '@angular/core';
import { ElectronService } from './electron.service';

export interface ChatRecord {
  id: number;
  name: string;
  status: string;
  avatar: string;
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatRecordInput {
  name: string;
  status: string;
  avatar: string;
  subtitle?: string;
  timeLabel?: string;
  unreadCount?: number;
  highlightTime?: boolean;
  avatarRing?: boolean;
  tipLabel?: string;
}

export interface UpdateChatTitleInput {
  chatId: number;
  name: string;
}

export interface MessageRecord {
  id: number;
  chatId: number;
  from: 'user' | 'supporter';
  value: string;
  tag?: string;
  time: string;
  isRead: boolean;
  possibleAnswers?: string[];
}

export interface CreateMessageRecordInput {
  chatId: number;
  from: 'user' | 'supporter';
  value: string;
  tag?: string;
  time: string;
  isRead: boolean;
  possibleAnswers?: string[];
}

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

  async markChatRead(chatId: number): Promise<boolean> {
    return this.electronService.invoke<boolean>('db:markChatRead', chatId);
  }

  async updateChatTitle(input: UpdateChatTitleInput): Promise<ChatRecord> {
    return this.electronService.invoke<ChatRecord>('db:updateChatTitle', input);
  }
}
