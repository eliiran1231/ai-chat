import { ChatProvidersModule } from '../services/chat-providers.module';
import { SqliteProvider } from '../chat-providers/SqliteProvider';

@ChatProvidersModule({
  providers: [
    SqliteProvider
  ],
})
export class AppChatProvidersModule {}