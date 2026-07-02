import { CommonModule } from '@angular/common';
import { Component, computed, Inject, OnInit, inject, signal } from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ChatProvider, ChatProviderMetadata } from '../../interfaces/ChatProvider';
import { AuthUser } from '../../interfaces/auth/AuthUser';
import { CHAT_PROVIDER } from '../../services/chat-providers.module';
import {
  ProviderConnectDialogComponent,
  ProviderConnectDialogData,
} from '../provider-connect-dialog/provider-connect-dialog-component';
import { SidebarSearchComponent } from '../shared/sidebar-search/sidebar-search-component';
import { ChatService } from '../../services/chat.service';

interface ProviderCard {
  provider: ChatProvider;
  metadata: ChatProviderMetadata;
  connected: boolean;
  busy: boolean;
  error?: string;
  user?: AuthUser | null;
}

@Component({
  selector: 'app-provider-list-component',
  imports: [CommonModule, DialogModule, SidebarSearchComponent],
  templateUrl: './provider-list-component.html',
  styleUrl: './provider-list-component.scss',
})
export class ProviderListComponent implements OnInit {
  readonly providerCards = signal<ProviderCard[]>([]);
  readonly searchTerm = signal('');
  readonly filteredProviderCards = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) return this.providerCards();

    return this.providerCards().filter(({ metadata }) =>
      `${metadata.displayName} ${metadata.description}`.toLocaleLowerCase().includes(query),
    );
  });
  private readonly dialog = inject(Dialog);
  private readonly chatService = inject(ChatService);

  constructor(@Inject(CHAT_PROVIDER) private readonly providers: ChatProvider[] = []) {}

  async ngOnInit(): Promise<void> {
    this.providerCards.set(
      this.providers.map((provider) => ({
        provider,
        metadata: provider.metadata,
        connected: false,
        busy: true,
        user: null,
      })),
    );

    await Promise.all(
      this.providers.map(async (provider) => {
        try {
          const user = await provider.authentication.getCurrentUser();
          this.patchProvider(provider.metadata.id, {
            busy: false,
            connected: Boolean(user),
            user,
            error: undefined,
          });
        } catch (error) {
          this.patchProvider(provider.metadata.id, {
            busy: false,
            connected: false,
            error: this.errorMessage(error),
          });
        }
      }),
    );
  }

  openConnectDialog(card: ProviderCard): void {
    this.patchProvider(card.metadata.id, { error: undefined });
    const dialogRef = this.dialog.open<AuthUser | undefined, ProviderConnectDialogData>(
      ProviderConnectDialogComponent,
      {
        data: { provider: card.provider },
        ariaLabel: `Connect ${card.metadata.displayName}`,
        backdropClass: 'provider-dialog-backdrop',
        disableClose: true,
      },
    );

    dialogRef.closed.subscribe(async (user) => {
      if (!user) return;
      this.patchProvider(card.metadata.id, {
        user,
        connected: true,
        busy: false,
        error: undefined,
      });
      await this.chatService.loadProviderChats(card.provider);
    });
  }

  async disconnect(card: ProviderCard): Promise<void> {
    this.patchProvider(card.metadata.id, { busy: true, error: undefined });
    try {
      await card.provider.authentication.logout();
      this.chatService.clearChats(card.provider.metadata.id);
      this.patchProvider(card.metadata.id, { busy: false, connected: false, user: null });
    } catch (error) {
      this.patchProvider(card.metadata.id, { busy: false, error: this.errorMessage(error) });
    }
  }

  private patchProvider(providerId: string, patch: Partial<ProviderCard>): void {
    this.providerCards.update((cards) =>
      cards.map((card) => (card.metadata.id === providerId ? { ...card, ...patch } : card)),
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
