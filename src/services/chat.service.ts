import { Inject, Injectable, Injector, computed, inject, signal } from '@angular/core';
import { Chat } from '../classes/Chat';
import { ChatProvider } from '../interfaces/ChatProvider';
import { CHAT_PROVIDER } from './chat-providers.module';
import { Router } from '@angular/router';
import { Agent } from '../classes/Agent';
import { AiAgent } from '../agents/AiAgent/AiAgent';
import { SqliteProvider } from '../chat-providers/SqliteProvider';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  readonly chats = signal<Chat[]>([]);
  private readonly _chatMap = new Map<string, Chat>()
  private loaded = false;
  private router = inject(Router);
  private routeId = signal<string | undefined>(undefined)
  private defaultProvider = inject(SqliteProvider);
  private isCreatingChat = signal(false); 
  private pendingCreateChat = signal<Promise<Chat> | null>(null);
  selectedChat = computed(() => this.getChatById(this.routeId()));
  injector = inject(Injector);

  constructor(@Inject(CHAT_PROVIDER) private chatProviders: ChatProvider[] = []) {
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
      .flatMap(r => r.value)
    this.chats.set(chats);
    chats.forEach(chat=> {
      chat.active = computed(()=>this.routeId() == chat.id());
      this._chatMap.set(chat.id(), chat)
    });
    this.loaded = true;
  }

  getChatById(id: string | null | undefined): Chat | undefined {
    if (!id) return undefined;
    return this._chatMap.get(id);
  }

  addChat(chat: Chat): void {
    this.chats.update(prev => [...prev, chat]);
    this._chatMap.set(chat.id(), chat);
  }

  async deleteChat(chat: Chat): Promise<void> {
    await chat.delete();
    this.removeChat(chat);
    if (this.selectedChat()?.id() === chat.id()) {
      this.router.navigate(['/chats']);
    }
  }

  private removeChat(chat: Chat): void {
    this.chats.update(prev => prev.filter(c => c.id() !== chat.id()));
    this._chatMap.delete(chat.id());
  }

  async openChat(chat: Chat): Promise<void> {
    await this.router.navigate(['/chats', chat.id()]);
    this.routeId.set(chat.id())
  }

  async createChat(
    openChat = true,
    initialAgent: Agent = new AiAgent(this.injector),
    provider: ChatProvider = this.defaultProvider
  ): Promise<Chat> {
    if (this.isCreatingChat()) {
      const pendingChat = this.pendingCreateChat();
      if (pendingChat) return pendingChat;
    }
    this.isCreatingChat.set(true);
    const chatNumber = this.chats().length + 1;
    const pending = (async () => {
      const chat = await provider.createChat(
        `New chat ${chatNumber}`,
        initialAgent,
        {
          subtitle: 'Tap to start chatting',
          timeLabel: 'now',
        }
      );
      this.addChat(chat);
      if (openChat) this.openChat(chat);
      return chat;
    })();
    this.pendingCreateChat.set(pending);

    try {
      return await pending;
    } finally {
      this.isCreatingChat.set(false);
      this.pendingCreateChat.set(null);
    }
  }

  async closeChat(): Promise<void> {
    const chat = this.selectedChat();
    if (!chat) return;
    await this.router.navigate(['/chats']);
    this.routeId.set(undefined)
  }
}
