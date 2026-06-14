import { DenyingManager } from '../agents/MockAgent/MockAgent';
import { ChatManager } from '../classes/ChatManager';
import { ChatManagersModule } from '../services/chat-managers.module';

@ChatManagersModule({
  managers: {
    ChatManager,
    DenyingManager,
  },
})
export class AppChatManagersModule {}