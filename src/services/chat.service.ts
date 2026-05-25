import { Injectable } from '@angular/core';
import { Answer } from '../classes/Answer';
import { Message } from '../classes/Message';
import { coerceValidatorSpec } from '../classes/MessageValidator';
import { Question, getPersistableValidationErrorMessage } from '../classes/Question';
import { Supporter } from '../classes/Supporter';
import { Chat } from '../classes/Chat';
import { Agent } from '../classes/Agent';
import { AgentsService } from './agents.service';
import { ChatRecord } from '../interfaces/db/ChatRecord';
import { MessageRecord } from '../interfaces/db/MessageRecord';
import { SupporterRecord } from '../interfaces/db/SupporterRecord';
import { DbService } from './db.service';
import { Uuid } from '../interfaces/db/Uuid';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(
    private dbService: DbService,
    private agentsService: AgentsService,
  ) {}

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

    const supporterRecord = await this.dbService.createSupporter({
      chatId: record.id,
      agentName: this.agentsService.getAgentName(initialAgent),
      context: '{}',
    });

    return this.hydrateChat(record, initialAgent, [], supporterRecord);
  }

  async getChats(): Promise<Chat[]> {
    const records = await this.dbService.getChats();
    return Promise.all(
      records.map(async (record) => {
        const [messages, persistedSupporterRecord] = await Promise.all([
          this.dbService.getChatMessages(record.id),
          this.dbService.getChatSupporter(record.id),
        ]);
        if(!persistedSupporterRecord?.agentName) throw new Error("couldnt retrieve agent from SQL")
        const initialAgent = this.agentsService.getAgentByName(persistedSupporterRecord.agentName);
        const supporterRecord = persistedSupporterRecord ?? await this.dbService.createSupporter({
          chatId: record.id,
          agentName: this.agentsService.getAgentName(initialAgent),
          context: '',
        });

        return this.hydrateChat(
          record,
          initialAgent,
          messages,
          supporterRecord,
        );
      }),
    );
  }

  async deleteChat(chatId: Uuid): Promise<boolean> {
    return this.dbService.deleteChat(chatId);
  }

  async markChatRead(chatId: Uuid): Promise<boolean> {
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

  hydrateChat(
    record: ChatRecord,
    initialAgent: Agent,
    messageRecords: MessageRecord[],
    supporterRecord?: SupporterRecord | null,
  ): Chat {
    const supporter = new Supporter();
    if (supporterRecord) {
      supporter.id = supporterRecord.id;
    }
    try{
      supporter.setContext(JSON.parse(supporterRecord?.context ?? '{}'));
    }
    catch{
      supporter.setContext(supporterRecord?.context ?? '{}');
    }
    const chat = new Chat(record.id, record.name, record.status, record.avatar, supporter, {
      subtitle: record.subtitle,
      timeLabel: record.timeLabel,
      unreadCount: record.unreadCount,
      highlightTime: record.highlightTime,
      avatarRing: record.avatarRing,
      tipLabel: record.tipLabel,
    });
    for (const messageRecord of messageRecords) {
      const message = this.hydrateMessage(messageRecord);
      message.setChat(chat);
      chat.messages.push(message);
    }
    this.attachMessagePersistence(chat);
    this.attachSupporterPersistence(chat);
    supporter.setAgent(initialAgent);
    return chat;
  }

  private hydrateMessage(record: MessageRecord): Message {
    const messageType = record.messageType ?? 'message';
    const {attachment, id} = record
    const message = messageType === 'question'
      ? this.hydrateQuestion(record)
      : messageType === 'answer'
        ? new Answer(record.value, {attachment, id})
        : new Message(record.value, {attachment, id});
    message.from = record.from;
    message.tag = record.tag ?? 'general';
    message.time = new Date(record.time);
    message.editedAt = record.editedAt ? new Date(record.editedAt) : undefined;
    message.isRead = record.isRead;
    message.editable = record.editable;
    message.deletable = record.deletable;
    return message;
  }

  private hydrateQuestion(record: MessageRecord): Question {
    const question = new Question(record.value, {
      attachment: record.attachment,
      id: record.id,
    });
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

  private attachMessagePersistence(chat: Chat): void {
    const pendingMessagePersists = new WeakMap<Message, Promise<void>>();

    const persistMessage = async (message: Message) => {
      const messageType = message instanceof Answer ? "answer" : message instanceof Question ? "question" : "message";
      const record = await this.dbService.createMessage({
        id: message.id,
        chatId: chat.id,
        from: message.from,
        messageType,
        value: message.value,
        tag: message.tag,
        time: message.time.toISOString(),
        editedAt: message.editedAt?.toISOString(),
        isRead: message.isRead,
        editable: message.editable,
        deletable: message.deletable,
        attachment: message.attachment,
        possibleAnswers: message instanceof Question
          ? message.possibleAnswers.map((possibleAnswer) =>
              typeof possibleAnswer === 'string'
                ? possibleAnswer
                : possibleAnswer.value
            )
          : undefined,
        validatorSpec: message instanceof Question ? message.validatorSpec : undefined,
        validationErrorMessage: message instanceof Question
          ? getPersistableValidationErrorMessage(message.validationErrorMessage)
          : undefined,
      });
      message.id = record.id;
      message.isRead = record.isRead;
      message.editable = record.editable;
      message.deletable = record.deletable;
    };

    const persistMessageEdit = async (message: Message) => {
      await pendingMessagePersists.get(message);
      await this.dbService.updateMessage({
        id: message.id,
        value: message.value,
        editedAt: message.editedAt?.toISOString() ?? message.time.toISOString(),
      });
    };

    const persistMessageDelete = async (message: Message) => {
      await pendingMessagePersists.get(message);
      await this.dbService.deleteMessage(message.id);
    };

    chat.onMessageEdited.subscribe((message) => {
      void persistMessageEdit(message);
    });
    chat.onMessageDeleted.subscribe((message) => {
      void persistMessageDelete(message);
    });

    chat.supporter.onMessageAdded.subscribe((message) => {
      const persisted = persistMessage(message);
      pendingMessagePersists.set(message, persisted);
      void persisted.finally(() => pendingMessagePersists.delete(message));
      void persisted;
    });
    chat.user.onMessageAdded.subscribe((message) => {
      const persisted = persistMessage(message);
      pendingMessagePersists.set(message, persisted);
      void persisted.finally(() => pendingMessagePersists.delete(message));
      void persisted;
    });
  }

  private attachSupporterPersistence(chat: Chat): void {
    chat.supporter.onAgentSwitch.subscribe((agent) => {
      void this.dbService.updateSupporterAgent({
        chatId: chat.id,
        agentName: this.agentsService.getAgentName(agent),
      });
    });
    chat.supporter.onContextChange.subscribe((context) => {
      if (context === null) return;
      void this.dbService.updateSupporterContext({
        chatId: chat.id,
        context,
      });
    });
  }
}
