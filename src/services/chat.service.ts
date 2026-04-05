import { Injectable } from '@angular/core';
import { Answer } from '../classes/Answer';
import { Message } from '../classes/Message';
import { Question } from '../classes/Question';
import { Supporter } from '../classes/Supporter';
import { Chat } from '../classes/Chat';
import { Agent } from '../classes/Agent';
import { ChatRecord, DbService, MessageRecord } from './db.service';

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

    return this.hydrateChat(record, initialAgent, []);
  }

  async getChats(initialAgentFactory: () => Agent): Promise<Chat[]> {
    const records = await this.dbService.getChats();
    return Promise.all(
      records.map(async (record) => {
        const messages = await this.dbService.getChatMessages(record.id);
        return this.hydrateChat(record, initialAgentFactory(), messages);
      }),
    );
  }

  async deleteChat(chatId: number): Promise<boolean> {
    return this.dbService.deleteChat(chatId);
  }

  async markChatRead(chatId: number): Promise<boolean> {
    return this.dbService.markChatRead(chatId);
  }

  async setChatTitle(chat: Chat, title: string): Promise<void> {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || chat.name === trimmedTitle) {
      return;
    }

    const record = await this.dbService.updateChatTitle({
      chatId: chat.id,
      name: trimmedTitle,
    });

    chat.name = record.name;
  }

  hydrateChat(record: ChatRecord, initialAgent: Agent, messageRecords: MessageRecord[]): Chat {
    const supporter = new Supporter();
    const chat = new Chat(record.id, record.name, record.status, record.avatar, supporter, {
      subtitle: record.subtitle,
      timeLabel: record.timeLabel,
      unreadCount: record.unreadCount,
      highlightTime: record.highlightTime,
      avatarRing: record.avatarRing,
      tipLabel: record.tipLabel,
    });
    for (const messageRecord of messageRecords) {
      chat.messages.push(this.hydrateMessage(messageRecord));
    }
    this.attachMessagePersistence(chat);
    supporter.setAgent(initialAgent);
    return chat;
  }

  private hydrateMessage(record: MessageRecord): Message {
    const message = record.possibleAnswers?.length
      ? this.hydrateQuestion(record)
      : new Message(record.value, record.from);
    message.id = record.id;
    message.tag = record.tag ?? 'general';
    message.time = new Date(record.time);
    message.isRead = record.isRead;
    return message;
  }

  private hydrateQuestion(record: MessageRecord): Question {
    const question = new Question(record.value, record.from);
    question.possibleAnswers = (record.possibleAnswers ?? []).map(
      (possibleAnswer) => new Answer(possibleAnswer, 'user'),
    );
    return question;
  }

  private attachMessagePersistence(chat: Chat): void {
    const persistMessage = async (message: Message) => {
      const record = await this.dbService.createMessage({
        chatId: chat.id,
        from: message.from,
        value: typeof message.value === 'string' ? message.value : message.value.name,
        tag: message.tag,
        time: message.time.toISOString(),
        isRead: message.isRead,
        possibleAnswers: message instanceof Question
          ? message.possibleAnswers.map((possibleAnswer) =>
              typeof possibleAnswer === 'string'
                ? possibleAnswer
                : typeof possibleAnswer.value === 'string'
                  ? possibleAnswer.value
                  : possibleAnswer.value.name,
            )
          : undefined,
      });
      message.id = record.id;
      message.isRead = record.isRead;
    };

    chat.supporter.setOnMessageAdded(persistMessage);
    chat.user.setOnMessageAdded(persistMessage);
  }
}
