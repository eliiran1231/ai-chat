import { Inject, Injectable, computed, signal } from '@angular/core';
import { Chat } from '../classes/Chat';
import { ChatProvider } from '../interfaces/ChatProvider';
import { CHAT_PROVIDER } from './chat-providers.module';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  readonly chats = signal<Chat[]>([]);
  private readonly _chatMap = computed(() => {
    const map = new Map<string, Chat>();
    for (const chat of this.chats()) {
      map.set(chat.id(), chat);
    }
    return map;
  });
  private loaded = false;

  constructor(@Inject(CHAT_PROVIDER) private chatProviders: ChatProvider[] = []) {
    this.loadChats()
  }

  async loadChats(): Promise<void> {
    if (this.loaded) return;
    const providers = this.chatProviders ?? [];
    const fulfilledFilter = (result: PromiseSettledResult<Chat[]>) => {
      if (result.status == 'rejected') {
        console.error(result.reason);
      }
      return result.status == 'fulfilled';
    }
    const chatPromises = providers.map(provider => provider.getChats());
    const chats = (await Promise.allSettled(chatPromises))
      .filter(fulfilledFilter)
      .flatMap(r => r.value);
    this.chats.set(chats);
    this.loaded = true;
  }

  getChatById(id: string | null | undefined): Chat | undefined {
    if (!id) return undefined;
    return this._chatMap().get(id);
  }

  addChat(chat: Chat): void {
    this.chats.update(prev => [...prev, chat]);
  }

  removeChat(chat: Chat): void {
    this.chats.update(prev => prev.filter(c => c !== chat));
  }
}
