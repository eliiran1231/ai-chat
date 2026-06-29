import { Component, HostListener, Injector, OnInit, Signal, computed, inject, signal } from '@angular/core';
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
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

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
  private chatService = inject(ChatService);
  private profileService = inject(ProfileService);
  private defaultProvider = inject(SqliteProvider);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private injector = inject(Injector);
  searchTerm = signal('');
  // whatsappLogoUrl: string | null = 'image.png';
  whatsappLogoUrl = signal<string | undefined>(undefined);
  chats = this.chatService.chats;
  isCreatingChat = signal(false);
  isMenuOpen = signal(false);
  isFullscreen = signal(false);
  pendingCreateChat = signal<Promise<Chat> | null>(null);
  selectedTab = signal<'chats' | 'profile' | 'calls'>('chats');
  routeId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id')))
  );
  selectedChat = computed(() => this.chatService.getChatById(this.routeId()));

  async ngOnInit(): Promise<void> {
    void this.profileService.loadBasicInfo();
    this.syncFullscreenState();
    queueMicrotask(() => window.focus());
  }

  unreadChatsCount = computed(() => this.chats().filter((chat) => chat.unreadCount() > 0).length);

  async openChat(chat: Chat): Promise<void> {
    this.selectedChat()?.active.set(false);
    this.router.navigate(['/chats', chat.id()]);
    chat.active.set(true);
  }

  closeChat(): void {
    const chat = this.selectedChat();
    if (!chat) return;
    chat.active.set(false);
    this.router.navigate(['/chats']);
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
    this.chatService.removeChat(chat);
    if (this.selectedChat()?.id === chat.id) {
      this.router.navigate(['/chats']);
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
      this.chatService.addChat(chat);
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
