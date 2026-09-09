import { computed, signal } from '@angular/core';
import { Message } from './Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { BatchActionStatus } from '../enums/BatchActionStatus';
import { BatchNegotiationMediator } from './BatchNegotiationMediator';
import { BatchNegotiator } from '../interfaces/BatchNegotiator';
import { Chat } from './Chat';


const approveAllBatches: BatchNegotiator = {
  negotiateBatchEdit: () => ({ type: BatchActionStatus.Approved }),
  negotiateBatchDelete: () => ({ type: BatchActionStatus.Approved }),
};

export class MessageCollection {

  constructor(private chat: Chat, public negotiator: BatchNegotiator = approveAllBatches){}

  private readonly _messages = signal<ReadonlySet<Message>>(new Set());
  readonly messages = this._messages.asReadonly();
  readonly canDelete = computed(() =>
    this._messages().size > 0 && [...this.messages()].every((message) => message.deletable()),
  );
  readonly canEdit = computed(() =>
    this._messages().size > 0 && [...this.messages()].every((message) =>
      message.from() === 'client' && message.editable()),
  );
  negotiationMediator = new BatchNegotiationMediator(new Set(this._messages()));

  addMessage(message: Message): void {
    message.setChat(this.chat);
    this._messages.update((messages) => new Set([...messages, message]));
  }

  removeMessage(message: Message): void {
    this._messages.update((messages) => {
      const next = new Set(messages);
      next.delete(message);
      return next;
    });
  }

  clearMessages(): void {
    this._messages.set(new Set());
  }

  selectMessages(messages: Iterable<Message>): void {
    const chatMessages = new Set(this.chat.messages());
    this._messages.set(new Set([...messages].filter((message) => chatMessages.has(message))));
  }

  async delete(): Promise<Message[]> {
    this.negotiationMediator = new BatchNegotiationMediator(new Set(this._messages()));
    const messages = await this.chat.manager.requestBatchDelete(this);
    const deleted = new Set(messages.filter((message) =>
      message.status() === MessageStatus.Sent || message.status() === MessageStatus.Read));
    this._messages.update((messages) => new Set(
      [...messages].filter((message) => !deleted.has(message)),
    ));
    return messages;
  }

  async edit(newValues: string[]): Promise<Message[]> {
    this.negotiationMediator = new BatchNegotiationMediator(new Set(this._messages()));
    return this.chat.manager.requestBatchEdit(this, newValues);
  }
}
