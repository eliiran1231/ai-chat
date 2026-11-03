import { Injector, NgZone } from '@angular/core';
import { Message } from './Message';
import { Chat, FileSelectionResult, savedFile } from './Chat';
import { MessageStatus } from '../enums/MessagesStatus';
import { SyncedEntity } from './SyncedEntity';
import { ChatProvider } from '../interfaces/ChatProvider';
import { ChatService } from '../services/chat.service';
import { AlertService } from '../services/alert.service';
import { ClientNegotiator } from './ClientNegotiator';
import { LanguageService } from '../services/language.service';
import { OperationsNegotiationMediator } from './OperationsNegotiationMediator';
import type {
  DeleteNegotiationAnswer,
  EditNegotiationAnswer,
  OperationsNegotiator,
} from '../interfaces/OperationsNegotiator';
import { AcceptedEditCandidate, DeleteProposal, EditProposal } from './Proposals';
import { Unsent } from '../app/types/Unsent';
import { SavedChatFile } from '../services/fileExplorer.service';

export type MessageDeletionResult =
  | MessageStatus
  | { status: MessageStatus; deletedIds: ReadonlySet<string> };

export class ChatManager {
  protected chat!: Chat;
  protected chatProvider: ChatProvider;
  protected chatService: ChatService;
  protected readonly alertService: AlertService;
  protected readonly languageService: LanguageService;
  private negotiator: OperationsNegotiator = {
    negotiateBatchEdit: this.isAllowedToEditMessages.bind(this),
    negotiateBatchDelete: this.isAllowedToDeleteMessages.bind(this),
  };

  constructor(injector: Injector, chatProvider: ChatProvider) {
    this.chatProvider = chatProvider;
    this.chatService = injector.get(ChatService);
    this.alertService = injector.get(AlertService);
    this.languageService = injector.get(LanguageService);
  }

  init(chat: Chat): void | Promise<void> {
    this.chat = chat;
  }

  //@internal don't use
  createClientNegotiator(): ClientNegotiator {
    return new ClientNegotiator(this.alertService, this.languageService);
  }

  private async request(
    isAllowedAction: (message: Message) => boolean | Promise<boolean>,
    action: (message: Message) => MessageStatus | Promise<MessageStatus>,
    message: Message,
  ) {
    message.status.set(MessageStatus.Pending, true);
    const isAllowed = await isAllowedAction(message);
    if (!isAllowed) {
      message.status.set(MessageStatus.Failed, true);
      return MessageStatus.Failed;
    }
    const status = (await action(message)) ?? MessageStatus.Failed;
    message.status.set(status, status == MessageStatus.Failed);
    return status;
  }

  isAllowedToSendMessages(message: Message): boolean | Promise<boolean> {
    return true;
  }

  requestMessageSend(message: Message) {
    return this.request(
      (message) => this.isAllowedToSendMessages(message),
      (message) => this.onMessageSendRequested(message),
      message,
    );
  }

  isAllowedToEditMessages(
    proposal: EditProposal,
    proposer: OperationsNegotiator,
  ): EditNegotiationAnswer | Promise<EditNegotiationAnswer> {
    return true;
  }

  isAllowedToDeleteMessages(
    proposal: DeleteProposal,
    proposer: OperationsNegotiator,
  ): DeleteNegotiationAnswer | Promise<DeleteNegotiationAnswer> {
    return true;
  }

  async requestMessagesDelete(
    proposal: DeleteProposal,
    negotiator: OperationsNegotiator,
  ): Promise<MessageStatus> {
    const negotiationResult = await new OperationsNegotiationMediator(
      this.chat.user.negotiator,
    ).negotiate(proposal, negotiator, this.negotiator);
    if (!negotiationResult) return MessageStatus.Failed;

    const messages = [...negotiationResult.contents];
    messages.forEach((message, i) => {
      message.status.set(MessageStatus.Pending, true);
      message['lastAction'] = () => this.requestMessagesDelete(proposal, negotiator);
    });
    const result = (await this.onMessagesDeleteRequested(messages)) ?? MessageStatus.Failed;
    const status = typeof result === 'number' ? result : result.status;
    const deleted =
      typeof result === 'number'
        ? status === MessageStatus.Failed
          ? []
          : messages
        : messages.filter((message) => result.deletedIds.has(message.id()));
    const deletedSet = new Set(deleted);
    messages.forEach((message) =>
      message.status.set(
        deletedSet.has(message)
          ? status === MessageStatus.Failed
            ? MessageStatus.Sent
            : status
          : MessageStatus.Failed,
        true,
      ),
    );
    this.chat.messages.update((current) => current.filter((message) => !deletedSet.has(message)));
    if (deleted.length) this.chat.onMessagesDeleted.next(deleted);
    return status;
  }

  async requestMessagesEdit(proposal: EditProposal, negotiator: OperationsNegotiator) {
    const negotiationResult = await new OperationsNegotiationMediator(
      this.chat.user.negotiator,
    ).negotiate<EditProposal>(proposal, negotiator, this.negotiator);
    if (!negotiationResult) return MessageStatus.Failed;
    const acceptedCandidates = [...negotiationResult.contents];
    acceptedCandidates.forEach(({ newMessage, oldMessage }) => {
      oldMessage['lastAction'] = () => this.requestMessagesEdit(proposal, negotiator);
      oldMessage.status.set(MessageStatus.Pending, true);
      oldMessage.value.set(newMessage.value(), true);
      oldMessage.editedAt.set(newMessage.editedAt(), true);
    });
    const status = await this.onMessagesEditRequested(acceptedCandidates);
    acceptedCandidates.forEach(({ newMessage, oldMessage }) => {
      const success = status != MessageStatus.Failed;
      oldMessage.status.set(status, !success);
      if (!success) return;
      oldMessage.value.set(newMessage.value());
      oldMessage.editedAt.set(newMessage.editedAt());
    });
    const messages = acceptedCandidates.map(({ oldMessage }) => oldMessage);
    if (status !== MessageStatus.Failed) this.chat.onMessagesEdited.next(messages);
    return status;
  }

  protected onMessagesDeleteRequested(
    messages: Message[],
  ): MessageDeletionResult | Promise<MessageDeletionResult> {
    return MessageStatus.Read;
  }

  protected onMessagesEditRequested(
    messages: AcceptedEditCandidate[],
  ): MessageStatus | Promise<MessageStatus> {
    return MessageStatus.Read;
  }

  async requestDelete(): Promise<void> {
    const isDeleted = await this.onDeleteRequested();
    isDeleted && this.chatService.removeChat(this.chat.id());
  }

  requestPropChange(target: SyncedEntity, prop: string | Symbol | undefined, newValue: any) {
    return this.onMessagePropChangeRequested(target, prop, newValue);
  }

  protected onMessageSendRequested(
    message: Unsent<Message>,
  ): MessageStatus | Promise<MessageStatus> {
    return MessageStatus.Read;
  }

  protected onMessagePropChangeRequested(
    target: SyncedEntity,
    prop: string | Symbol | undefined,
    newValue: any,
  ) {
    return MessageStatus.Read;
  }

  protected onDeleteRequested(): boolean | Promise<boolean> {
    return true;
  }

  async onFileSelected(file: File): Promise<FileSelectionResult> {
    //override to handle file attachments
    return { urlBlob: URL.createObjectURL(file), savedChatFile: undefined };
  }

  async onFileCanceled(fileId: string | undefined) {}

  releaseFileUrl(url: string): void {
    URL.revokeObjectURL(url);
  }
}
