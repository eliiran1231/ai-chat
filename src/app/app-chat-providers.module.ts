import { NgModule } from '@angular/core';
import { SqliteProvider } from '../chat-providers/SqliteProvider';
import { CHAT_PROVIDER } from '../services/chat-providers.module';

@NgModule({
  providers: [
    { 
      provide: CHAT_PROVIDER,
      useClass: SqliteProvider,
      multi: true
    },
  ],
})
export class AppChatProvidersModule {}