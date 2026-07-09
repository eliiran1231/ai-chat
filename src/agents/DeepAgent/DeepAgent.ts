import { Injector } from '@angular/core';
import { Agent } from '../../classes/Agent';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { Supporter } from '../../classes/Supporter';
import { DeepAgentClientService } from '../../services/deep-agent-client.service';
import type { DeepAgentHistoryMessage } from '../../../shared/ipc/deep-agent-channels';

export class DeepAgent extends Agent {
  private readonly client: DeepAgentClientService;

  constructor(private readonly injector: Injector) {
    super(injector);
    this.client = injector.get(DeepAgentClientService);
  }

  override async init(chat: Chat, supporter: Supporter, isNewChat = false): Promise<void> {
    await super.init(chat, supporter, isNewChat);
    if (isNewChat) {
      chat.name.set('Deep Agent');
      chat.avatar.set({ type: 'text', value: 'DA' });
      await supporter.sendMessage('Hello, how can I help you today?');
    }
  }

  override async respond(edited = false): Promise<void> {
    super.respond(edited);
    const latestMessage = this.chat.messages().at(-1);
    if (!latestMessage || latestMessage.from() !== 'client') return;

    const previousState = this.client.stateFor(this.chat.id());
    try {
      const response = await this.client.startRun({
        chatId: this.chat.id(),
        latestMessage: this.serializeMessage(latestMessage),
        history: this.chat.messages()
          .filter((message) => message.from() === 'client' || message.from() === 'supporter')
          .map((message) => this.serializeMessage(message)),
        resetThread: edited || previousState.requiresReset,
      });
      await this.supporter.sendMessage(response);
      this.client.clear(this.chat.id());
    } catch (error) {
      if (error instanceof Error && error.message !== 'DEEP_AGENT_RUN_CANCELLED') {
        console.error('Deep Agent run failed.', error);
      }
    }
  }

  override async onDestroy(): Promise<void> {
    if (this.client.isActive(this.chat.id())) {
      await this.client.cancel(this.chat.id());
    }
    super.onDestroy();
  }

  private serializeMessage(message: Message): DeepAgentHistoryMessage {
    return {
      id: message.id(),
      role: message.from() === 'supporter' ? 'assistant' : 'user',
      content: message.value(),
    };
  }
}
