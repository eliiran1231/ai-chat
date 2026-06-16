import { DefaultManager } from '../chat-managers/DefaultManager';
import { ChatManagersModule } from '../services/chat-managers.module';

@ChatManagersModule({
  managers: {
    DefaultManager,
  },
})
export class AppChatManagersModule {}