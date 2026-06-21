import { inject, Injectable, Injector, signal } from '@angular/core';
import { ChatProvider } from '../interfaces/ChatProvider';
import { Chat, ChatOptions } from '../classes/Chat';
import { DbService } from '../services/db.service';
import { AgentsService } from '../services/agents.service';
import {
  getPersistableValidationErrorMessage,
  Question,
  QuestionOptions,
} from '../classes/Question';
import { Message, MessageOptions } from '../classes/Message';
import { Answer } from '../classes/Answer';
import { coerceValidatorSpec } from '../classes/MessageValidator';
import { MessageRecord } from '../interfaces/db/MessageRecord';
import { Supporter } from '../classes/Supporter';
import { SupporterRecord } from '../interfaces/db/SupporterRecord';
import { Agent } from '../classes/Agent';
import { ChatRecord } from '../interfaces/db/ChatRecord';
import { Uuid } from '../interfaces/db/Uuid';
import { SqliteManager } from '../chat-managers/SqliteManager';

@Injectable({
  providedIn: 'root',
})
export class SqliteProvider implements ChatProvider {
    private dbService = inject(DbService);
    private agentsService = inject(AgentsService);
    private injector: Injector = inject(Injector);

  async addMessage(chatId: Uuid, message: Message): Promise<void> {
    await this.persistMessage(chatId, message);
  }
  async deleteMessage(messageId: Uuid): Promise<void> {
    await this.dbService.deleteMessage(messageId);
  }
  async editMessage(message: Message): Promise<void> {
    await this.commitMessageChanges(message);
  }
  
  private async persistMessage(chatId: Uuid, message: Message) {
    const messageType =
      message instanceof Answer ? 'answer' : message instanceof Question ? 'question' : 'message';
    const record = await this.dbService.createMessage({
      id: message.id(),
      chatId: chatId,
      from: message.from(),
      messageType,
      value: message.value(),
      tag: message.tag(),
      time: message.time().toISOString(),
      editedAt: message.editedAt()?.toISOString(),
      status: message.status(),
      editable: message.editable(),
      deletable: message.deletable(),
      attachment: message.attachment(),
      possibleAnswers:
        message instanceof Question
          ? message.possibleAnswers().map((possibleAnswer) =>
              typeof possibleAnswer === 'string' ? possibleAnswer : possibleAnswer.value(),
            )
          : undefined,
      validatorSpec: message instanceof Question ? message.validatorSpec?.() : undefined,
      validationErrorMessage:
        message instanceof Question
          ? getPersistableValidationErrorMessage(message.validationErrorMessage)
          : undefined,
    });
    message.id = signal(record.id);
    message.status.set(record.status);
    message.editable.set(record.editable);
    message.deletable.set(record.deletable);
    message.setSaveChangesHandler((target) => void this.commitMessageChanges(target));
  }

  async commitMessageChanges(message: Message): Promise<boolean> {
    const messageType =
      message instanceof Answer ? 'answer' : message instanceof Question ? 'question' : 'message';
    return this.dbService.commitMessage({
      id: message.id(),
      from: message.from(),
      messageType,
      value: message.value(),
      tag: message.tag(),
      time: message.time().toISOString(),
      editedAt: message.editedAt()?.toISOString(),
      status: message.status(),
      editable: message.editable(),
      deletable: message.deletable(),
      attachment: message.attachment(),
      possibleAnswers:
        message instanceof Question
          ? message.possibleAnswers().map((answer) => answer.value())
          : undefined,
      validatorSpec: message instanceof Question ? message.validatorSpec?.() : undefined,
      validationErrorMessage:
        message instanceof Question
          ? getPersistableValidationErrorMessage(message.validationErrorMessage)
          : undefined,
    });
  }

  commitChatChanges(chat: Chat): Promise<boolean> {
    return this.dbService.commitChat({
      id: chat.id(),
      name: chat.name(),
      status: chat.status(),
      avatar: chat.avatar(),
      subtitle: chat.subtitle(),
      timeLabel: chat.timeLabel(),
      unreadCount: chat.unreadCount(),
      highlightTime: chat.highlightTime(),
      avatarRing: chat.avatarRing(),
      tipLabel: chat.tipLabel(),
    });
  }

  async commitSupporterChanges(supporter: Supporter): Promise<void> {
    await this.dbService.commitSupporter({
      id: supporter.id(),
      name: supporter.name(),
      expects: supporter.expects(),
      context: supporter.context,
    });
  }

  async getChats(): Promise<Chat[]> {
    const records = await this.dbService.getChats();
    return Promise.all(
      records.map(async (record) => {
        const [messages, persistedSupporterRecord] = await Promise.all([
          this.dbService.getChatMessages(record.id),
          this.dbService.getChatSupporter(record.id),
        ]);
        if (!persistedSupporterRecord?.agentName)
          throw new Error("couldn't retrieve agent from SQL");
        const initialAgent = this.agentsService.getAgentByName(persistedSupporterRecord.agentName);
        initialAgent.name = persistedSupporterRecord.agentName;
        const supporterRecord =
          persistedSupporterRecord ??
          (await this.dbService.createSupporter({
            chatId: record.id,
            agentName: initialAgent.name,
            context: '',
          }));

        return this.hydrateChat(record, initialAgent, messages, supporterRecord);
      }),
    );
  }

  async createChat(name: string, initialAgent: Agent, options: ChatOptions = {}): Promise<Chat> {
    const record = await this.dbService.createChat({
      name,
      status: options.status,
      avatar: options.avatar,
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

    return this.hydrateChat(record, initialAgent, [], supporterRecord);
  }

  async deleteChat(chatId: Uuid): Promise<void> {
    return void this.dbService.deleteChat(chatId);
  }

  hydrateChat(
    record: ChatRecord,
    initialAgent: Agent,
    messageRecords: MessageRecord[],
    supporterRecord: SupporterRecord,
  ): Chat {
    let context;
    try {
      context = supporterRecord ? JSON.parse(supporterRecord.context) : {};
    } catch {
      context = {};
    }
    const supporter = new Supporter(
      supporterRecord.id,
      supporterRecord.name,
      supporterRecord.expects,
      context,
    );
    const manager = new SqliteManager(this.injector, this);
    const chat = new Chat(record.id, record.name, supporter, manager, {
      status: record.status,
      avatar: record.avatar,
      subtitle: record.subtitle,
      timeLabel: record.timeLabel,
      unreadCount: record.unreadCount,
      highlightTime: record.highlightTime,
      avatarRing: record.avatarRing,
      tipLabel: record.tipLabel,
    });
    chat.setSaveChangesHandler((target) => void this.commitChatChanges(target));
    for (const messageRecord of messageRecords) {
      const message = this.hydrateMessage(messageRecord, manager);
      message.setChat(chat);
      chat.messages.update(messages => [...messages, message]);
    }
    supporter.setSaveChangesHandler(this.commitSupporterChanges.bind(this));
    supporter.onAgentSwitch.subscribe((agent) =>
      this.dbService.updateSupporterAgent({
        chatId: chat.id(),
        agentName: agent.name,
      }),
    );
    supporter.setAgent(initialAgent);
    return chat;
  }

  private hydrateMessage(record: MessageRecord, manager: SqliteManager): Message {
    const messageType = record.messageType ?? 'message';
    const options: MessageOptions = {
      ...record,
      time: new Date(record.time),
      editedAt: record.editedAt ? new Date(record.editedAt) : undefined,
    };

    const message =
      messageType === 'question'
        ? this.hydrateQuestion(record, options)
        : messageType === 'answer'
          ? new Answer(record.value, options)
          : new Message(record.value, options);
    message.setSaveChangesHandler((target) => void this.commitMessageChanges(target));
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
      question.validationErrorMessage = new Message(record.validationErrorMessage);
    }

    return question;
  }
}
