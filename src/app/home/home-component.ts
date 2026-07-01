import { Component, HostListener, Injector, OnInit, Signal, computed, effect, inject, signal } from '@angular/core';
import { ChatComponent } from '../chat/chat-component';
import { ChatService } from '../../services/chat.service';
import { ChatListComponent } from '../chat-list-component/chat-list-component';
import { ProfileComponent } from '../profile-component/profile-component';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../services/profile.service';
import {
  LucideEllipsisVertical,
  LucideMaximize,
  LucideMinimize,
} from '@lucide/angular';
import { SidebarMenuComponent } from '../shared/sidebar-menu/sidebar-menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Chat } from '../../classes/Chat';
import { ProviderListComponent } from '../provider-list-component/provider-list-component';

@Component({
  selector: 'app-home',
  imports: [
    ChatComponent,
    SidebarMenuComponent,
    ChatListComponent,
    ProfileComponent,
    ProviderListComponent,
    CommonModule,
  ],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss',
})
export class HomeComponent implements OnInit {
  readonly menuIcon = LucideEllipsisVertical;
  readonly enterFullscreenIcon = LucideMaximize;
  readonly exitFullscreenIcon = LucideMinimize;
  private profileService = inject(ProfileService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private routeId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id')))
  );
  chatService = inject(ChatService);
  searchTerm = signal('');
  // whatsappLogoUrl: string | null = 'image.png';
  whatsappLogoUrl = signal<string | undefined>(undefined);
  chats = this.chatService.chats;
  isMenuOpen = signal(false);
  isFullscreen = signal(false);
  selectedTab = signal<'chats' | 'profile' | 'providers'>('chats');

  constructor(){
    effect(()=>{
      this.chatService['setSelectedChatId'](this.routeId());
    })
  }

  async ngOnInit(): Promise<void> {
    void this.profileService.loadBasicInfo();
    this.syncFullscreenState();
    await this.chatService.loadChats();
    queueMicrotask(() => window.focus());
  }

  unreadChatsCount = computed(() => this.chats().filter((chat) => chat.unreadCount() > 0).length);

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

  openChat(chat: Chat) {
    return this.router.navigate(['/chats', chat.id()]);
  }

  closeChat() {
    return this.router.navigate(['/chats']);
  }

  async createChat(){
    let chat = await this.chatService.createChat();
    await this.openChat(chat);
  }

  async deleteChat(chat: Chat): Promise<void> {
    await chat.delete()
    if (this.chatService.selectedChat()?.id() === chat.id()) {
      this.router.navigate(['/chats']);
    }
  }
}
