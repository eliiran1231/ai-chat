import { Inject, Injectable, Injector, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { Chat } from '../classes/Chat';
import { ChatProvider } from '../interfaces/ChatProvider';
import { CHAT_PROVIDER } from './chat-providers.module';
import { Router } from '@angular/router';
import { Agent } from '../classes/Agent';
import { AiAgent } from '../agents/AiAgent/AiAgent';
import { SqliteProvider } from '../chat-providers/SqliteProvider';
import { Uuid } from '../interfaces/db/Uuid';
import { AppNotificationService } from './app-notification.service';
import { Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  readonly chats = signal<Chat[]>([]);
  private readonly _chatMap = new Map<string, Chat>()
  private loaded = false;
  private selectedChatId: WritableSignal<string | null | undefined> = signal(undefined);
  private defaultProvider = inject(SqliteProvider);
  private isCreatingChat = signal(false); 
  private pendingCreateChat = signal<Promise<Chat> | null>(null);
  private notificationSubscriptions = new Map<string, Subscription>();
  private notificationService = inject(AppNotificationService);
  selectedChat = computed(() => this.getChatById(this.selectedChatId()));
  injector = inject(Injector);

  constructor(@Inject(CHAT_PROVIDER) private chatProviders: ChatProvider[] = []) {
  }

  private setSelectedChatId(id: string | null | undefined) {
    if (this.selectedChatId() === id) return;
    const prev = this.selectedChatId();
    this.selectedChatId.set(id);
    if (prev) this._chatMap.get(prev)?.active.set(false);
    if (!id) return;
    let targetChat = this._chatMap.get(id);
    targetChat?.active.set(true);
    targetChat?.markAsRead();
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
    chats.forEach(chat => this.addChatToMap(chat));
    this.loaded = true;
  }

  async loadProviderChats(provider: ChatProvider): Promise<void> {
    const chats = await provider.getChats();
    this.clearChats(provider.metadata.id);
    this.chats.update(current => [...current, ...chats]);
    chats.forEach(chat => this.addChatToMap(chat));
  }

  getChatById(id: string | null | undefined): Chat | undefined {
    if (!id) return undefined;
    return this._chatMap.get(id);
  }

  addChat(chat: Chat): void {
    this.chats.update(prev => [...prev, chat]);
    this.addChatToMap(chat);
  }

  private addChatToMap(chat: Chat): void {
    this._chatMap.set(chat.id(), chat);
    this.watchChatNotifications(chat);
  }

  removeChat(chatId: Uuid): void {
    this.chats.update(prev => prev.filter(c => c.id() !== chatId));
    this._chatMap.delete(chatId)
    this.stopWatchingChatNotifications(chatId);
  }

  private watchChatNotifications(chat: Chat): void {
    this.stopWatchingChatNotifications(chat.id());
    const subscription = chat.supporter.onMessageAdded.subscribe((message) => {
      void this.notificationService.notifySupporterMessage(chat, message);
    });
    this.notificationSubscriptions.set(chat.id(), subscription);
  }

  private stopWatchingChatNotifications(chatId: string): void {
    this.notificationSubscriptions.get(chatId)?.unsubscribe();
    this.notificationSubscriptions.delete(chatId);
  }

  async deleteAllChats(): Promise<void> {
    const chats = [...this.chats()];
    const selectedChatId = this.selectedChatId();

    await Promise.all(chats.map((chat) => chat.delete()));

    if (selectedChatId && !this._chatMap.has(selectedChatId)) {
      this.setSelectedChatId(undefined);
    }
  }

  clearChats(providerId?: string): void {
    if (providerId) {
      const providerChatIds = new Set(
        this.chats()
          .filter(chat => chat.belongsToProvider(providerId))
          .map(chat => chat.id()),
      );
      if (providerChatIds.has(this.selectedChatId() ?? '')) this.setSelectedChatId(null);
      this.chats.update(chats => chats.filter(chat => !providerChatIds.has(chat.id())));
      providerChatIds.forEach(chatId => {
        this._chatMap.delete(chatId);
        this.stopWatchingChatNotifications(chatId);
      });
      return;
    }

    this.chats.set([]);
    this._chatMap.clear();
    this.notificationSubscriptions.forEach((subscription) => subscription.unsubscribe());
    this.notificationSubscriptions.clear();
    this.setSelectedChatId(null);
    this.loaded = false;
  }

  async createChat(
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
}
