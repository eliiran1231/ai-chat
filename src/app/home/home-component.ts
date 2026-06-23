import { Component, HostListener, inject, Injector, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
import { MockAgent } from '../../agents/MockAgent/MockAgent';
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
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './home-component.scss',
})
export class HomeComponent implements OnInit {
  readonly menuIcon = LucideEllipsisVertical;
  readonly enterFullscreenIcon = LucideMaximize;
  readonly exitFullscreenIcon = LucideMinimize;
  searchTerm = '';
  // whatsappLogoUrl: string | null = 'image.png';
  whatsappLogoUrl?: string;
  selectedChat: Chat | null = null;
  chats: Chat[] = [];
  isCreatingChat = false;
  isMenuOpen = false;
  isFullscreen = false;
  pendingCreateChat: Promise<Chat> | null = null;
  selectedTab: 'chats' | 'profile' | 'calls' = 'chats';
  constructor(
    private chatService: ChatService,
    private injector: Injector,
    private profileService: ProfileService,
    private defaultProvider: SqliteProvider
    ) {
  }

  async ngOnInit(): Promise<void> {
    void this.profileService.loadBasicInfo();
    this.chats = await this.chatService.getChats();
    this.syncFullscreenState();
    queueMicrotask(() => window.focus());
  }

  get unreadChatsCount(): number {
    return this.chats.filter((chat) => chat.unreadCount > 0).length; // i know this is not the most efficient way to do this, but it works for now. We can optimize later if needed.
  }

  async openChat(chat: Chat): Promise<void> {
    this.selectedChat = chat;
    chat.active = true;
    chat.isRead = true;
  }

  closeChat(): void {
    if (!this.selectedChat) return;
    this.selectedChat.active = false;
    this.selectedChat = null;
  }

  async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  }

  private syncFullscreenState(): void {
    this.isFullscreen = Boolean(document.fullscreenElement);
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
    this.chats = this.chats.filter((existingChat) => existingChat.id !== chat.id);
    if (this.selectedChat?.id === chat.id) {
      this.selectedChat = null;
    }
  }

  async createNewChat(
    openChat = true,
    initialAgent: Agent = new AiAgent(this.injector),
    provider: ChatProvider = this.defaultProvider
  ): Promise<Chat> {
    if (this.isCreatingChat && this.pendingCreateChat) {
      return this.pendingCreateChat;
    }

    this.isCreatingChat = true;
    const chatNumber = this.chats.length + 1;
    this.pendingCreateChat = (async () => {
      const chat = await provider.createChat(
        `New chat ${chatNumber}`,
        initialAgent,
        {
          subtitle: 'Tap to start chatting',
          timeLabel: 'now',
        }
      );
      this.chats = [...this.chats, chat];
      if (openChat) await this.openChat(chat);
      return chat;
    })();

    try {
      return await this.pendingCreateChat;
    } finally {
      this.isCreatingChat = false;
      this.pendingCreateChat = null;
    }
  }
}
