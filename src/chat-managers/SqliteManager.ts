import { Injector } from '@angular/core';
import { ChatManager, MessageDeletionResult } from '../classes/ChatManager';
import { Attachment, Message } from '../classes/Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { DbService } from '../services/db.service';
import { Chat, FileSelectionResult, savedFile } from '../classes/Chat';
import { SqliteProvider } from '../chat-providers/SqliteProvider';
import { AcceptedEditCandidate } from '../classes/Proposals';
import { Unsent } from '../app/types/Unsent';
import { FileExplorerService, SavedChatFile } from '../services/fileExplorer.service';

export class SqliteManager extends ChatManager {
  dbService: DbService;
  fileExplorerService: FileExplorerService;
  pendingMessagePersists = new WeakMap<Unsent<Message>, Promise<void>>();
  private readonly unsentMessages = new Set<Unsent<Message>>();
  private operation: Promise<void> = Promise.resolve();

  constructor(injector: Injector, sqliteProvider: SqliteProvider) {
    super(injector, sqliteProvider);
    this.dbService = injector.get(DbService);
    this.fileExplorerService = injector.get(FileExplorerService);
  }

  override init(chat: Chat): void | Promise<void> {
    super.init(chat);
  }

  override async onFileSelected(file: File): Promise<FileSelectionResult> {
    try {
      const savedFileDataObject: SavedChatFile = await this.fileExplorerService.saveFile(
        this.chat.id(),
        file,
      );
      return { urlBlob: undefined, savedChatFile: savedFileDataObject };
    } catch (error) {
      throw error;
    }
  }

  override async onFileCanceled(fileId: string | undefined): Promise<void> {
    if (!fileId) return;
    await this.fileExplorerService.deleteFile(this.chat.id(), fileId);
  }

  /** Called after Send, never just for opening a preview or editing text. */

  override onMessageSendRequested(message: Unsent<Message>): Promise<MessageStatus> {
    return this.inOrder(async () => {
      this.unsentMessages.add(message);
      try {
        await this.saveAttachment(message);
        const persisted = this.chatProvider.addMessage(this.chat.id(), message) as Promise<void>;
        this.pendingMessagePersists.set(message, persisted);
        try {
          await persisted;
        } finally {
          this.pendingMessagePersists.delete(message);
        }
        this.unsentMessages.delete(message);
        return MessageStatus.Sent;
      } catch (error) {
        console.error(error);
        return MessageStatus.Failed;
      }
    });
  }

  protected override onMessagesEditRequested(
    candidates: AcceptedEditCandidate[],
  ): Promise<MessageStatus> {
    return this.inOrder(async () => {
      try {
        const editedIds = new Set(
          await this.chatProvider.editBatch(candidates.map((c) => c.newMessage)),
        );
        return candidates.every((c) => editedIds.has(c.oldMessage.id()))
          ? MessageStatus.Sent
          : MessageStatus.Failed;
      } catch (error) {
        console.error(error);
        return MessageStatus.Failed;
      }
    });
  }

  protected override onMessagesDeleteRequested(
    messages: Message[],
  ): Promise<MessageDeletionResult> {
    return this.inOrder(async () => {
      try {
        const deletedIds = new Set<string>(
          await this.chatProvider.deleteBatch(messages.map((message) => message.id())),
        );
        // A failed initial send may never have created a database row.
        for (const message of messages)
          if (this.unsentMessages.has(message)) deletedIds.add(message.id());
        for (const message of messages) {
          if (!deletedIds.has(message.id())) continue;
          await this.removeAttachment(message.attachment(), deletedIds);
          this.unsentMessages.delete(message);
        }
        return {
          status: messages.every((message) => deletedIds.has(message.id()))
            ? MessageStatus.Sent
            : MessageStatus.Failed,
          deletedIds,
        };
      } catch (error) {
        console.error(error);
        return MessageStatus.Failed;
      }
    });
  }

  private async removeAttachment(
    attachment: Attachment | undefined,
    deletedIds: ReadonlySet<string>,
  ): Promise<void> {
    if (!attachment) return;
    if (attachment.fileId) {
      try {
        await this.fileExplorerService.deleteFile(this.chat.id(), attachment.fileId);
      } catch (error) {
        console.error(error);
        // The service retains this deletion and retries before listing files for a ticket.
        this.alertService.toast(this.languageService.translate('file.cleanupFailed'));
      }
    }
    const stillDisplayed = this.chat
      .messages()
      .some(
        (message) => !deletedIds.has(message.id()) && message.attachment()?.url === attachment.url,
      );
    if (!stillDisplayed) this.releaseFileUrl(attachment.url);
  }

  /** Keep send/edit/delete writes for this chat in order, including their file operations. */
  private inOrder<T>(action: () => Promise<T>): Promise<T> {
    const task = this.operation.then(action);
    this.operation = task.then(
      () => {},
      () => {},
    );
    return task;
  }

  override async onDeleteRequested(): Promise<boolean> {
    super.onDeleteRequested();
    try {
      await this.chatProvider.deleteChat(this.chat.id());
      return true;
    } catch {
      return false;
    }
  }
}
