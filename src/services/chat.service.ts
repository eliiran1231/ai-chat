import { Injectable } from '@angular/core';
import { Supporter } from '../classes/Supporter';
import { Chat } from '../classes/chat';
import { Agent } from '../classes/Agent';
import { ChatRecord, DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(private dbService: DbService) {}

  async createChat(
    name: string,
    status: string,
    initialAgent: Agent,
    options: {
      subtitle?: string;
      timeLabel?: string;
      unreadCount?: number;
      highlightTime?: boolean;
      avatarRing?: boolean;
      tipLabel?: string;
    } = {},
  ): Promise<Chat> {
    const record = await this.dbService.createChat({
      name,
      status,
      avatar: name.slice(0, 2).toUpperCase(),
      subtitle: options.subtitle,
      timeLabel: options.timeLabel,
      unreadCount: options.unreadCount,
      highlightTime: options.highlightTime,
      avatarRing: options.avatarRing,
      tipLabel: options.tipLabel,
    });

    return this.hydrateChat(record, initialAgent);
  }

  async getChats(initialAgentFactory: () => Agent): Promise<Chat[]> {
    const records = await this.dbService.getChats();
    return records.map((record) => this.hydrateChat(record, initialAgentFactory()));
  }

  async deleteChat(chatId: number): Promise<boolean> {
    return this.dbService.deleteChat(chatId);
  }

  hydrateChat(record: ChatRecord, initialAgent: Agent): Chat {
    const supporter = new Supporter();
    const chat = new Chat(record.id, record.name, record.status, record.avatar, supporter, {
      subtitle: record.subtitle,
      timeLabel: record.timeLabel,
      unreadCount: record.unreadCount,
      highlightTime: record.highlightTime,
      avatarRing: record.avatarRing,
      tipLabel: record.tipLabel,
    });
    supporter.setAgent(initialAgent);
    return chat;
  }
}
