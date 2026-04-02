import { Agent } from '../classes/Agent';
import { Chat } from '../classes/chat';
import { Supporter } from '../classes/Supporter';
import { AiService } from '../services/ai.service';

export class AiAgent extends Agent {
  constructor(private aiService: AiService) {
    super();
  }

  override init(chat: Chat, supporter: Supporter) {
    super.init(chat, supporter);
    if (chat.messages.length === 0) {
      supporter.sendMessage('Hello, how can I help you today?');
    }
  }

  override async respond(): Promise<void> {
    super.respond();
    const lastMessage = this.chat.messages[this.chat.messages.length - 1];
    this.aiService.sendMessage(lastMessage.value as string).subscribe((response) => {
      this.chat.name = response.model;
      const aiMessage = response.choices[0].message.content;
      this.supporter.sendMessage(aiMessage);
    });
  }
}
