import { effect, EffectRef, Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import {
  DeepAgentClientService,
  type DeepAgentRunState,
} from '../../services/deep-agent-client.service';
import type { DeepAgentHistoryMessage } from '../../../shared/ipc/deep-agent-channels';

export class DeepAgent extends Agent {
  private readonly client: DeepAgentClientService;
  private actionsSync?: EffectRef;

  constructor(private readonly injector: Injector) {
    super(injector);
    this.client = injector.get(DeepAgentClientService);
  }

  override async init(chat: Chat, supporter: Supporter, isNewChat = false): Promise<void> {
    await super.init(chat, supporter, isNewChat);
    this.actionsSync?.destroy();
    this.actionsSync = effect(
      () => supporter.actions.set(this.actionsForState(this.client.stateFor(chat.id()))),
      { injector: this.injector },
    );
    if (isNewChat) {
      chat.name.set('Deep Agent');
      chat.avatar.set({ type: 'text', value: 'DA' });
      await supporter.sendMessage('Hello, how can I help you today?');
    }
  }

  override async respond(edited = false): Promise<void> {
    super.respond(edited);
    if (!this.lastMessage || this.lastMessage.from() !== 'client') return;

    const previousState = this.client.stateFor(this.chat.id());
    try {
      const response = this.client.startRun({
        chatId: this.chat.id(),
        latestMessage: this.serializeMessage(this.lastMessage),
        history: this.chat.messages()
          .map((message) => this.serializeMessage(message)),
        resetThread: edited || previousState.requiresReset,
      });
      await this.supporter.stream(response, new Message(''));
    } catch (error) {
      if (error instanceof Error && error.message !== 'DEEP_AGENT_RUN_CANCELLED') {
        console.error('Deep Agent run failed.', error);
      }
    }
  }

  override async onDestroy(): Promise<void> {
    await this.cancelResponse();
    this.actionsSync?.destroy();
    this.supporter.actions.set([]);
    super.onDestroy();
  }

  override async cancelResponse(): Promise<void> {
    if (this.client.isActive(this.chat.id())) {
      await this.client.cancel(this.chat.id());
    }
  }

  private actionsForState(state: DeepAgentRunState): string[] {
    if (state.status === 'running') return [state.activity ?? 'Thinking...'];
    if (state.status === 'cancelling') return ['Stopping...'];
    return [];
  }

  private serializeMessage(message: Message): DeepAgentHistoryMessage {
    return {
      id: message.id(),
      role: message.from() === 'supporter' ? 'assistant' : 'user',
      content: message.value(),
    };
  }
}
