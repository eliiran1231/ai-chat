import { Injector } from "@angular/core";
import { ChatManager } from "../classes/ChatManager";
import { Message } from "../classes/Message";
import { MessageStatus } from "../enums/MessagesStatus";
import { DbService } from "../services/db.service";
import { Chat } from "../classes/Chat";
import { SqliteProvider } from "../chat-providers/SqliteProvider";

export class SqliteManager extends ChatManager {
  dbService: DbService;
  pendingMessagePersists = new WeakMap<Message, Promise<void>>();

  constructor(injector: Injector, sqliteProvider: SqliteProvider) {
    super(injector, sqliteProvider);
    this.dbService = injector.get(DbService);
  }

  override init(chat: Chat): void | Promise<void> {
    super.init(chat);
  }

  override async onSendRequested(message: Message): Promise<MessageStatus> {
    super.onSendRequested(message);
    try {
        const persisted = this.chatProvider.addMessage(this.chat.id, message) as Promise<void>;
        this.pendingMessagePersists.set(message, persisted);
        void persisted.finally(() => this.pendingMessagePersists.delete(message));
        await persisted;
        return MessageStatus.Sent;
    } catch (error) {
      console.error(error);
      return MessageStatus.Failed;
    }
  }

  override async onEditRequested(message: Message, oldMessage: Message): Promise<MessageStatus> {
    super.onEditRequested(message, oldMessage);
    try {
      await this.chatProvider.editMessage(message);
      return MessageStatus.Sent;
    } catch (error) {
      console.error(error);
      return MessageStatus.Failed;
    }
  }

  override async onDeleteRequested(message: Message): Promise<MessageStatus> {
    super.onDeleteRequested(message);
    try {
      await this.pendingMessagePersists.get(message);
      await this.chatProvider.deleteMessage(message.id);
      return MessageStatus.Sent;
    } catch (error) {
      console.error(error);
      return MessageStatus.Failed;
    }
  }
}