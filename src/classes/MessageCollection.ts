import { computed, signal } from '@angular/core';
import { Message } from './Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { BatchNegotiator } from '../interfaces/BatchNegotiator';
import { Chat } from './Chat';
import { Proposal } from './Proposal';


const approveAllBatches: BatchNegotiator = {
  negotiateBatchEdit: () => true,
  negotiateBatchDelete: () => true,
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

  async delete(): Promise<Message[]> {
    const proposal = new Proposal(new Set(this._messages()), 'delete');
    const messages = await this.chat['manager'].requestBatchDelete(proposal, this.negotiator);
    const deleted = new Set(messages.filter((message) =>
      message.status() === MessageStatus.Sent || message.status() === MessageStatus.Read));
    this._messages.update((messages) => new Set(
      [...messages].filter((message) => !deleted.has(message)),
    ));
    return messages;
  }

  async edit(newValues: string[]): Promise<Message[]> {
    const proposal = new Proposal(new Set(this._messages()), 'edit');
    return this.chat['manager'].requestBatchEdit(proposal, this.negotiator, newValues);
  }
}
