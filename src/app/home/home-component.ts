import {
  Component,
  HostListener,
  Injector,
  OnInit,
  Signal,
  computed,
  Inject,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ChatComponent } from '../chat/chat-component';
import { ChatService } from '../../services/chat.service';
import { ChatListComponent } from '../chat-list-component/chat-list-component';
import { ProfileComponent } from '../profile-component/profile-component';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../services/profile.service';
import { LucideEllipsisVertical, LucideMaximize, LucideMinimize } from '@lucide/angular';
import { SidebarMenuComponent } from '../shared/sidebar-menu/sidebar-menu';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Chat } from '../../classes/Chat';
import { ProviderListComponent } from '../provider-list-component/provider-list-component';
import { CHAT_PROVIDER } from '../../services/chat-providers.module';
import { ChatProvider } from '../../interfaces/ChatProvider';
import {
  AnimatedDialogComponent,
} from '../animated-dialog-component/animated-dialog-component';
import {
  ProviderSelectionDialogComponent,
  ProviderSelectionDialogData,
} from '../provider-selection-dialog-component/provider-selection-dialog-component';

@Component({
  selector: 'app-home',
  imports: [
    ChatComponent,
    SidebarMenuComponent,
    ChatListComponent,
    ProfileComponent,
    ProviderListComponent,
    CommonModule,
    DialogModule,
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
  private dialog = inject(Dialog);
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

  constructor(@Inject(CHAT_PROVIDER) readonly providers: ChatProvider[] = []){
    effect(()=>{
      this.chatService['setSelectedChatId'](this.routeId());
    });
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

  openSettings() {
    return this.router.navigate(['/settings']);
  }

  createChat(): void {
    const dialogRef = this.dialog.open<ChatProvider | undefined, ProviderSelectionDialogData>(
      AnimatedDialogComponent,
      {
        data: {
          component: ProviderSelectionDialogComponent,
          providers: this.providers,
          width: '90vw',
          animation: this.providers.length == 1 ? 'none' : 'pop'
        },
        ariaLabel: 'Choose a chat provider',
        backdropClass: 'provider-dialog-backdrop',
        disableClose: true,
      },
    );

    dialogRef.closed.subscribe(async (provider) => {
      if (!provider) return;
      const chat = await this.chatService.createChat(undefined, provider);
      await this.openChat(chat);
    });
  }

  async deleteChat(chat: Chat): Promise<void> {
    await chat.delete();
    if (this.chatService.selectedChat()?.id() === chat.id()) {
      this.router.navigate(['/chats']);
    }
  }
}
