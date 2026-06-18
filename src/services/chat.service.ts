import { Inject, Injectable } from '@angular/core';
import { Chat } from '../classes/Chat';
import { ChatProvider } from '../interfaces/ChatProvider';
import { CHAT_PROVIDER } from './chat-providers.module';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  constructor(@Inject(CHAT_PROVIDER) private chatProviders: ChatProvider[] = []) {}

  async getChats(): Promise<Chat[]> {
    const providers = this.chatProviders ?? [];
    const fulfilledFilter = (result: PromiseSettledResult<Chat[]>) => {
      if (result.status == 'rejected') {
        console.error(result.reason);
      }
      return result.status == 'fulfilled';
    }
    let chatPromises = providers.map(provider => provider.getChats());
    let chats = (await Promise.allSettled(chatPromises))
    .filter(fulfilledFilter)
    .flatMap(r => r.value);
    return chats;
  }
}
