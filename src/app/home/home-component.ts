import { Component, HostListener, Injector, OnInit, computed, signal } from '@angular/core';
import { ChatComponent } from '../chat/chat-component';
import { Chat } from '../../classes/Chat';
import { ChatService } from '../../services/chat.service';
import { Agent } from '../../classes/Agent';
import { ChatListComponent } from '../chat-list-component/chat-list-component';
import { ProfileComponent } from '../profile-component/profile-component';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../services/profile.service';
import {
  LucideEllipsisVertical,
  LucideMaximize,
  LucideMinimize,
} from '@lucide/angular';
import { AiAgent } from '../../agents/AiAgent/AiAgent';
import { SidebarMenuComponent } from '../shared/sidebar-menu/sidebar-menu';
import { SqliteProvider } from '../../chat-providers/SqliteProvider';
import { ChatProvider } from '../../interfaces/ChatProvider';

@Component({
  selector: 'app-home',
  imports: [
    ChatComponent,
    SidebarMenuComponent,
    ChatListComponent,
    ProfileComponent,
    CommonModule,
  ],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss',
})
export class HomeComponent implements OnInit {
  readonly menuIcon = LucideEllipsisVertical;
  readonly enterFullscreenIcon = LucideMaximize;
  readonly exitFullscreenIcon = LucideMinimize;
  searchTerm = signal('');
  // whatsappLogoUrl: string | null = 'image.png';
  whatsappLogoUrl = signal<string | undefined>(undefined);
  selectedChat = signal<Chat | null>(null);
  chats = signal<Chat[]>([]);
  isCreatingChat = signal(false);
  isMenuOpen = signal(false);
  isFullscreen = signal(false);
  pendingCreateChat = signal<Promise<Chat> | null>(null);
  selectedTab = signal<'chats' | 'profile' | 'calls'>('chats');
  constructor(
    private chatService: ChatService,
    private injector: Injector,
    private profileService: ProfileService,
    private defaultProvider: SqliteProvider
    ) {
  }

  async ngOnInit(): Promise<void> {
    void this.profileService.loadBasicInfo();
    this.chats.set(await this.chatService.getChats());
    this.syncFullscreenState();
    queueMicrotask(() => window.focus());
  }

  unreadChatsCount = computed(() => this.chats().filter((chat) => chat.unreadCount() > 0).length);

  async openChat(chat: Chat): Promise<void> {
    this.selectedChat.set(chat);
    chat.active.set(true);
  }

  closeChat(): void {
    const chat = this.selectedChat();
    if (!chat) return;
    chat.active.set(false);
    this.selectedChat.set(null);
  }

  async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  private syncFullscreenState(): void {
    this.isFullscreen.set(Boolean(document.fullscreenElement));
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    this.syncFullscreenState();
  }

  @HostListener('document:keydown', ['$event'])
  async onDocumentKeydown(event: KeyboardEvent): Promise<void> {
    if (event.key !== 'F11') {
      return;
    }

    event.preventDefault();
    await this.toggleFullscreen();
  }
  async deleteChat(chat: Chat): Promise<void> {
    await chat.delete();
    this.chats.update((prev) => prev.filter((existingChat) => existingChat.id !== chat.id));
    if (this.selectedChat()?.id === chat.id) {
      this.selectedChat.set(null);
    }
  }

  async createNewChat(
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
      this.chats.update((prev) => [...prev, chat]);
      if (openChat) await this.openChat(chat);
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
