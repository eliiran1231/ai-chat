import { computed, signal } from '@angular/core';
import { Message } from './Message';
import { MessageStatus } from '../enums/MessagesStatus';
import { OperationsNegotiator } from '../interfaces/OperationsNegotiator';
import { Chat } from './Chat';
import { DeleteProposal, EditCandidate, EditProposal } from './Proposals';
import { defaultNegotiator } from './DefaultNegotiator';

export class MessageCollection {

  constructor(private chat: Chat, public negotiator: OperationsNegotiator = defaultNegotiator){}

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
    const status = await this.chat['manager'].requestMessagesDelete(proposal, this.negotiator);
    if(status != MessageStatus.Failed) this.clearMessages(); 
    return status;
  }

  async edit(newValues: string[]): Promise<MessageStatus> {
    const messages = [...this._messages()];
    const editCandidates = new Set<EditCandidate>();
    newValues.forEach((newValue, i)=> {
      const oldMessage = messages[i]
      const newMessage = oldMessage.clone();
      newMessage.value.set(newValue, true);
      newMessage.time.set(new Date(), true);
      editCandidates.add({ oldMessage, newMessage });
    });
    const proposal = new EditProposal(editCandidates);
    return this.chat['manager'].requestMessagesEdit(proposal, this.negotiator);
  }
}
