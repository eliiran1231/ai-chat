import { Injector } from "@angular/core";
import { Agent } from "../../classes/Agent";
import { Chat } from "../../classes/Chat";
import { Message } from "../../classes/Message";
import { Supporter } from "../../classes/Supporter";
import { AiService } from "../../services/ai.service";
import { ChatService } from "../../services/chat.service";



export class AiAgent extends Agent {
  aiService: AiService;
  chatService: ChatService;
  constructor(private injector: Injector) {
    super(injector);
    this.aiService = this.injector.get(AiService);
    this.chatService = this.injector.get(ChatService);
  }

  override async init(chat: Chat, supporter: Supporter, isNewChat = false): Promise<void> {
    await super.init(chat, supporter);
    if (isNewChat) {
      await supporter.sendMessage('Hello, how can I help you today?');
    }
  }

  override async respond(): Promise<void> {
    super.respond();
    const lastMessage = this.chat.messages().at(-1) as Message;
    this.aiService.sendMessage(lastMessage.value()).subscribe((response) => {
      this.chat.name.set(response.model);
      this.chat.avatar.set({
        type: 'text',
        value: response.model.slice(0, 2).toUpperCase(),
      });
      const aiMessage = response.choices[0].message.content;
      this.supporter.sendMessage(aiMessage);
    });
  }
}
