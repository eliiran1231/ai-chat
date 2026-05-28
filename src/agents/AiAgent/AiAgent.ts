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

  override init(chat: Chat, supporter: Supporter) {
    super.init(chat, supporter);
    if (chat.messages.length === 0) {
      supporter.sendMessage('Hello, how can I help you today?');
    }
  }

  override async respond(): Promise<void> {
    super.respond();
    const lastMessage = this.chat.messages.at(-1) as Message;
    this.aiService.sendMessage(lastMessage.value as string).subscribe((response) => {
      void this.chatService.setChatTitle(this.chat, response.model);
      void this.chatService.updateChatAvatar(this.chat, {
        type: 'text',
        value: response.model.slice(0, 2).toUpperCase(),
      });
      const aiMessage = response.choices[0].message.content;
      this.supporter.sendMessage(aiMessage);
    });
  }
}
