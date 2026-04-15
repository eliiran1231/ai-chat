import { Injectable } from '@angular/core';
import { Answer } from '../classes/Answer';
import { Message } from '../classes/Message';
import { coerceValidatorSpec } from '../classes/MessageValidator';
import { Question, getPersistableValidationErrorMessage } from '../classes/Question';
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
    initialAgent.lastQuestion = this.findLastSupporterQuestion(chat.messages);
    return chat;
  }

  private hydrateMessage(record: MessageRecord): Message {
    const messageType = record.messageType ?? 'message';
    const message = messageType === 'question'
      ? this.hydrateQuestion(record)
      : messageType === 'answer'
        ? new Answer(record.value)
        : new Message(record.value);

    message.id = record.id;
    message.from = record.from;
    message.tag = record.tag ?? 'general';
    message.time = new Date(record.time);
    message.isRead = record.isRead;
    return message;
  }

  private hydrateQuestion(record: MessageRecord): Question {
    const question = new Question(record.value);
    question.from = record.from;
    question.setPossibleAnswers(record.possibleAnswers ?? []);
    const validatorSpec = coerceValidatorSpec(record.validatorSpec);
    if (validatorSpec) {
      question.setValidator(validatorSpec, record.validationErrorMessage);
    } else if (record.validationErrorMessage) {
      question.validationErrorMessage = record.validationErrorMessage;
    }
    return question;
  }

  private findLastSupporterQuestion(messages: Message[]): Question | undefined {
    return [...messages]
      .reverse()
      .find((message): message is Question => message instanceof Question && message.from === 'supporter');
  }

  private attachMessagePersistence(chat: Chat): void {
    const persistMessage = async (message: Message) => {
      const messageType = message instanceof Answer ? "answer" : message instanceof Question ? "question" : "message";
      const record = await this.dbService.createMessage({
        chatId: chat.id,
        from: message.from,
        messageType,
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
        validatorSpec: message instanceof Question ? message.validatorSpec : undefined,
        validationErrorMessage: message instanceof Question
          ? getPersistableValidationErrorMessage(message.validationErrorMessage)
          : undefined,
      });
      message.id = record.id;
      message.isRead = record.isRead;
    };

    chat.supporter.setOnMessageAdded(persistMessage);
    chat.user.setOnMessageAdded(persistMessage);
  }
}
