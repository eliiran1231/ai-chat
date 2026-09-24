import { Injector } from "@angular/core";
import { ChatManager } from "../classes/ChatManager";
import { Message } from "../classes/Message";
import { MessageStatus } from "../enums/MessagesStatus";
import { DbService } from "../services/db.service";
import { Chat } from "../classes/Chat";
import { SqliteProvider } from "../chat-providers/SqliteProvider";
import { AcceptedEditCandidate, EditProposal } from "../classes/Proposals";

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

  override async onMessageSendRequested(message: Message): Promise<MessageStatus> {
    super.onMessageSendRequested(message);
    try {
        const persisted = this.chatProvider.addMessage(this.chat.id(), message) as Promise<void>;
        this.pendingMessagePersists.set(message, persisted);
        void persisted.finally(() => this.pendingMessagePersists.delete(message));
        await persisted;
        return MessageStatus.Sent;
    } catch (error) {
      console.error(error);
      return MessageStatus.Failed;
    }
  }

  protected override async onMessagesEditRequested(acceptedCandidates: AcceptedEditCandidate[]): Promise<MessageStatus> {
    try {
      const messages = acceptedCandidates.map(c=>c.newMessage);
      const editedIds = new Set(await this.chatProvider.editBatch(messages));
      return messages.every((message) => editedIds.has(message.id())) ?
       MessageStatus.Sent :
       MessageStatus.Failed;
    } catch (error) {
      console.error(error);
      return MessageStatus.Failed;
    }
  }

  protected override async onMessagesDeleteRequested(messages: Message[]): Promise<MessageStatus> {
    try {
      await Promise.all(messages.map((message) => this.pendingMessagePersists.get(message)));
      const deletedIds = new Set(await this.chatProvider.deleteBatch(messages.map((message) => message.id())));
      return messages.every((message) =>deletedIds.has(message.id())) ? 
       MessageStatus.Sent : 
       MessageStatus.Failed
    } catch (error) {
      console.error(error);
      return MessageStatus.Failed;
    }
  }

  override async onDeleteRequested(): Promise<boolean> {
    super.onDeleteRequested();
    try {
      await this.chatProvider.deleteChat(this.chat.id());
      return true;
    }
    catch {
      return false;
    }
  }
}