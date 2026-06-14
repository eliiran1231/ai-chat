import { Injectable, Injector } from '@angular/core';
import { Answer } from '../classes/Answer';
import { Message, MessageOptions } from '../classes/Message';
import { coerceValidatorSpec } from '../classes/MessageValidator';
import { Question, QuestionOptions, getPersistableValidationErrorMessage } from '../classes/Question';
import { Supporter } from '../classes/Supporter';
import { Chat } from '../classes/Chat';
import { Agent } from '../classes/Agent';
import { AgentsService } from './agents.service';
import { ChatRecord } from '../interfaces/db/ChatRecord';
import { MessageRecord } from '../interfaces/db/MessageRecord';
import { SupporterRecord } from '../interfaces/db/SupporterRecord';
import { DbService } from './db.service';
import { Uuid } from '../interfaces/db/Uuid';
import { ChatManager } from '../classes/ChatManager';
import { ChatManagersService } from './chat-managers.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(
    private dbService: DbService,
    private agentsService: AgentsService,
    private chatManagersService: ChatManagersService,
    private injector: Injector
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
      avatar: { type: 'text', value: name.slice(0, 2).toUpperCase() },
      subtitle: options.subtitle,
      timeLabel: options.timeLabel,
      unreadCount: options.unreadCount,
      highlightTime: options.highlightTime,
      avatarRing: options.avatarRing,
      tipLabel: options.tipLabel,
    });

    const supporterRecord = await this.dbService.createSupporter({
      chatId: record.id,
      agentName: initialAgent.name,
      context: '{}',
    });

    return this.hydrateChat(record, initialAgent, undefined, [], supporterRecord);
  }

  async getChats(): Promise<Chat[]> {
    const records = await this.dbService.getChats();
    return Promise.all(
      records.map(async (record) => {
        let manager;
        if (record.managerName) {
          manager = this.chatManagersService.getManagerByName(record.managerName);
          manager.name = record.managerName;
        }
        const [messages, persistedSupporterRecord] = await Promise.all([
          this.dbService.getChatMessages(record.id),
          this.dbService.getChatSupporter(record.id),
        ]);
        if(!persistedSupporterRecord?.agentName) throw new Error("couldnt retrieve agent from SQL")
        const initialAgent = this.agentsService.getAgentByName(persistedSupporterRecord.agentName);
        initialAgent.name = persistedSupporterRecord.agentName;
        const supporterRecord = persistedSupporterRecord ?? await this.dbService.createSupporter({
          chatId: record.id,
          agentName: initialAgent.name,
          context: '',
        });

        return this.hydrateChat(
          record,
          initialAgent,
          manager,
          messages,
          supporterRecord,
        );
      }),
    );
  }

  async deleteChat(chatId: Uuid): Promise<boolean> {
    return this.dbService.deleteChat(chatId);
  }

  private async commitSupporterChanges(supporter: Supporter): Promise<void> {
    await this.dbService.commitSupporter({
      id: supporter.id,
      name: supporter.name,
      expects: supporter.expects,
      context: supporter.context,
    });
  }

  hydrateChat(
    record: ChatRecord,
    initialAgent: Agent,
    initialManager: ChatManager | undefined,
    messageRecords: MessageRecord[],
    supporterRecord?: SupporterRecord | null,
  ): Chat {
    let context;
    try{
      context = supporterRecord ? JSON.parse(supporterRecord.context) : {};
    }
    catch{
      context = {};
    }
    const supporter = new Supporter(
      supporterRecord?.id, 
      supporterRecord?.name, 
      supporterRecord?.expects, 
      context
    );
    const chat = new Chat(record.id, record.name, record.status, record.avatar, supporter, {
      subtitle: record.subtitle,
      timeLabel: record.timeLabel,
      unreadCount: record.unreadCount,
      highlightTime: record.highlightTime,
      avatarRing: record.avatarRing,
      tipLabel: record.tipLabel,
    });
    initialManager && chat.setManager(initialManager);
    chat.setSaveChangesHandler((target)=>this.commitChatChanges(target));
    for (const messageRecord of messageRecords) {
      const message = this.hydrateMessage(messageRecord);
      message.setChat(chat);
      chat.messages.push(message);
    }
    this.attachMessagePersistence(chat);
    supporter.setSaveChangesHandler((target)=>this.commitSupporterChanges(target));
    supporter.onAgentSwitch.subscribe((agent) => this.dbService.updateSupporterAgent({
      chatId: chat.id,
      agentName: agent.name,
    }));
    chat.onManagerSwitch.subscribe(() => this.dbService.updateChatManager({
      chatId: chat.id,
      managerName: chat.manager?.name
    }));
    supporter.setAgent(initialAgent);
    return chat;
  }

  private async commitChatChanges(chat: Chat): Promise<void> {
    await this.dbService.commitChat({
      id: chat.id,
      name: chat.name,
      status: chat.status,
      avatar: chat.avatar,
      subtitle: chat.subtitle,
      timeLabel: chat.timeLabel,
      unreadCount: chat.unreadCount,
      highlightTime: chat.highlightTime,
      avatarRing: chat.avatarRing,
      tipLabel: chat.tipLabel,
    });
  }

  private async commitMessageChanges(message: Message): Promise<void> {
    const messageType = message instanceof Answer ? 'answer' : message instanceof Question ? 'question' : 'message';
    await this.dbService.commitMessage({
      id: message.id,
      from: message.from,
      messageType,
      value: message.value,
      tag: message.tag,
      time: message.time.toISOString(),
      editedAt: message.editedAt?.toISOString(),
      status: message.status,
      editable: message.editable,
      deletable: message.deletable,
      attachment: message.attachment,
      possibleAnswers: message instanceof Question
        ? message.possibleAnswers.map((answer) => answer.value)
        : undefined,
      validatorSpec: message instanceof Question ? message.validatorSpec : undefined,
      validationErrorMessage: message instanceof Question
        ? getPersistableValidationErrorMessage(message.validationErrorMessage)
        : undefined,
    });
  }

  private hydrateMessage(record: MessageRecord): Message {
    const messageType = record.messageType ?? 'message';
    const options: MessageOptions = {
      ...record,
      time: new Date(record.time),
      editedAt: record.editedAt ? new Date(record.editedAt) : undefined,
    };

    const message = messageType === 'question'
      ? this.hydrateQuestion(record, options)
      : messageType === 'answer'
        ? new Answer(record.value, options)
        : new Message(record.value, options);
    message.setSaveChangesHandler((target)=>this.commitMessageChanges(target));
    return message;
  }

  private hydrateQuestion(record: MessageRecord, options: MessageOptions): Question {
    const validatorSpec = coerceValidatorSpec(record.validatorSpec);
    const questionOptions: QuestionOptions = {
      ...options,
      possibleAnswers: record.possibleAnswers,
      validationErrorMessage: record.validationErrorMessage,
      validator: validatorSpec,
    };
    const question = new Question(record.value, questionOptions);

    if (!validatorSpec && record.validationErrorMessage) {
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
        status: message.status,
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
      message.status = record.status;
      message.editable = record.editable;
      message.deletable = record.deletable;
      message.setSaveChangesHandler((target)=>this.commitMessageChanges(target));
    };

    const persistMessageDelete = async (message: Message) => {
      await pendingMessagePersists.get(message);
      await this.dbService.deleteMessage(message.id);
    };
    
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
}
