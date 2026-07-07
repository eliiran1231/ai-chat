import { inject, Injectable, Injector, signal } from '@angular/core';
import { ChatProvider } from '../interfaces/ChatProvider';
import { Chat, ChatOptions } from '../classes/Chat';
import { DbService } from '../services/db.service';
import { AgentsService } from '../services/agents.service';
import {
  getPersistableValidationErrorMessage,
  Question,
} from '../classes/Question';
import { Message } from '../classes/Message';
import { Answer } from '../classes/Answer';
import { Supporter } from '../classes/Supporter';
import { SupporterRecord } from '../interfaces/db/SupporterRecord';
import { Agent } from '../classes/Agent';
import { ChatRecord } from '../interfaces/db/ChatRecord';
import { Uuid } from '../interfaces/db/Uuid';
import { SqliteManager } from '../chat-managers/SqliteManager';
import { SqliteMessagesSource } from '../message-sources/SqliteMessagesSource';

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
      answerSelectionMode: message instanceof Question
        ? message.answerSelectionMode()
        : undefined,
    });
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
      answerSelectionMode: message instanceof Question ? message.answerSelectionMode() : undefined,
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
        const persistedSupporterRecord = await this.dbService.getChatSupporter(record.id);
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

        return this.hydrateChat(record, initialAgent, supporterRecord, false);
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

    return this.hydrateChat(record, initialAgent, supporterRecord, true);
  }

  async deleteChat(chatId: Uuid): Promise<void> {
    return void this.dbService.deleteChat(chatId);
  }

  async hydrateChat(
    record: ChatRecord,
    initialAgent: Agent,
    supporterRecord: SupporterRecord,
    isNewChat: boolean,
  ): Promise<Chat> {
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
    chat.loader.addSource(new SqliteMessagesSource(chat, this.dbService, this.commitMessageChanges.bind(this)));
    await chat.loader.loadNextChunk();
    supporter.setSaveChangesHandler(this.commitSupporterChanges.bind(this));
    supporter.onAgentSwitch.subscribe((agent) =>
      this.dbService.updateSupporterAgent({
        chatId: chat.id(),
        agentName: agent.name,
      }),
    );
    await supporter.setAgent(initialAgent, isNewChat);
    return chat;
  }

}
