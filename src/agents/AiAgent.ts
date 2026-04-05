import { Injector } from '@angular/core';
import { Agent } from '../classes/Agent';
import { Chat } from '../classes/Chat';
import { Supporter } from '../classes/Supporter';
import { AiService } from '../services/ai.service';
import { ChatService } from '../services/chat.service';
import { Message } from '../classes/Message';

export class AiAgent extends Agent {
  aiService: AiService;
  chatService: ChatService;
  constructor(private injector: Injector) {
    super();
    this.aiService = this.injector.get(AiService);
    this.chatService = this.injector.get(ChatService);
  }

  override init(chat: Chat, supporter: Supporter) {
    super.init(chat, supporter);
    if (chat.messages.length === 0) {
      supporter.sendMessage('Hello, how can I help you today?');
    }
  }

  override async respond(): Promise<void> {
    await super.respond();
    const lastMessage = this.chat.messages.at(-1) as Message;
    this.aiService.sendMessage(lastMessage.value as string).subscribe((response) => {
      void this.chatService.setChatTitle(this.chat, response.model);
      const aiMessage = response.choices[0].message.content;
      this.supporter.sendMessage(aiMessage);
    });
  }
}
