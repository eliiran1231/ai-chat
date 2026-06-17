import { inject, Inject, Injectable, Injector, Type } from '@angular/core';
import { Chat } from '../classes/Chat';
import { ChatProvider } from '../interfaces/ChatProvider';
import { REGISTERED_CHAT_PROVIDERS } from './chat-providers.module';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatProviders?: ChatProvider[];
  constructor(
    private injector: Injector,
    @Inject(REGISTERED_CHAT_PROVIDERS) private chatProviderTypes: Type<ChatProvider>[]
  ) {}

  async getChats(): Promise<Chat[]> {
    this.chatProviders ??= this.chatProviderTypes.map(type => this.injector.get(type));
    let chatPromises = this.chatProviders.map(provider=>provider.getChats())
    let chats = (await Promise.allSettled(chatPromises))
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
    return chats;
  }
}
