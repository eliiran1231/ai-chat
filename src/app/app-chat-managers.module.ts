import { ChatManager } from '../classes/ChatManager';
import { ChatManagersModule } from '../services/chat-managers.module';

@ChatManagersModule({
  managers: {
    ChatManager
  },
})
export class AppChatManagersModule {}