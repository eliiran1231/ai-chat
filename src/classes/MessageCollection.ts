import { computed, signal } from '@angular/core';
import type { Message } from './Message';
import type { Chat } from './Chat';

export class MessageCollection {
  private readonly _messages = signal<ReadonlySet<Message>>(new Set());
  private readonly _isBusy = signal(false);
  readonly isBusy = this._isBusy.asReadonly();
  readonly messages = computed<ReadonlySet<Message>>(() => {
    const available = new Set(this.chat.messages());
    return new Set([...this._messages()].filter((message) => available.has(message)));
  });
  readonly size = computed(() => this.messages().size);
  readonly singleMessage = computed(() =>
    this.size() === 1 ? this.messages().values().next().value : undefined,
  );
  readonly canDelete = computed(() =>
    this.size() > 0 && [...this.messages()].every((message) => message.deletable()),
  );
  readonly canEdit = computed(() =>
    this.size() > 0 && [...this.messages()].every((message) =>
      message.from() === 'client' && message.editable()),
  );

  constructor(private readonly chat: Chat) {}

  addMessage(message: Message): void {
    if (!this.isBusy() && this.chat.messages().includes(message)) {
      this._messages.update((messages) => new Set([...messages, message]));
    }
  }

  removeMessage(message: Message): void {
    if (this.isBusy()) return;
    this._messages.update((messages) => {
      const next = new Set(messages);
      next.delete(message);
      return next;
    });
  }

  clearMessages(): void {
    this._messages.set(new Set());
  }

  async delete(): Promise<ReadonlyMap<Message, boolean>> {
    if (this.isBusy() || !this.canDelete()) return new Map();
    this._isBusy.set(true);
    try {
      const results = await this.chat.manager.requestBatchDelete([...this.messages()]);
      this._messages.update((messages) => new Set(
        [...messages].filter((message) => !results.get(message)),
      ));
      return results;
    } finally {
      this._isBusy.set(false);
    }
  }

  async edit(newValue: string): Promise<ReadonlyMap<Message, boolean>> {
    if (this.isBusy() || !this.canEdit()) return new Map();
    this._isBusy.set(true);
    try {
      return await this.chat.manager.requestBatchEdit([...this.messages()], newValue);
    } finally {
      this._isBusy.set(false);
    }
  }
}
