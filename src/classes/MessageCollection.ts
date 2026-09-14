import { computed, signal } from '@angular/core';
import { Message } from './Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { BatchNegotiator } from '../interfaces/BatchNegotiator';
import { Chat } from './Chat';
import { DeleteProposal, EditCandidate, EditProposal } from './Proposals';

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

  async delete(): Promise<MessageStatus> {
    const proposal = new DeleteProposal(new Set(this._messages()));
    const status = await this.chat['manager'].requestBatchDelete(proposal, this.negotiator);
    if(status != MessageStatus.Failed) this.clearMessages(); 
    return status;
  }

  async edit(newValues: string[]): Promise<MessageStatus> {
    const messages = [...this._messages()];
    const editCandidates = new Set<EditCandidate>();
    newValues.forEach((newValue, i)=> {
      const newMessage = messages[i];
      const oldMessage = newMessage;
      newMessage.value.set(newValue);
      newMessage.time.set(new Date());
      editCandidates.add({ oldMessage, newMessage });
    });
    const proposal = new EditProposal(editCandidates);
    return this.chat['manager'].requestBatchEdit(proposal, this.negotiator);
  }
}
