import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  Inject,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ChatProvider } from '../../interfaces/ChatProvider';
import type { AuthUser } from '../../../shared/auth/AuthUser';
import { CHAT_PROVIDER } from '../../services/chat-providers.module';
import { AnimatedDialogComponent } from '../animated-dialog-component/animated-dialog-component';
import {
  ProviderConnectDialogComponent,
  ProviderConnectDialogData,
} from '../provider-connect-dialog-component/provider-connect-dialog-component';
import { SidebarSearchComponent } from '../shared/sidebar-search/sidebar-search-component';
import { ChatService } from '../../services/chat.service';
import { ProviderCardComponent } from '../provider-card-component/provider-card-component';

@Component({
  selector: 'app-provider-list-component',
  imports: [CommonModule, DialogModule, SidebarSearchComponent, ProviderCardComponent],
  templateUrl: './provider-list-component.html',
  styleUrl: './provider-list-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderListComponent implements OnInit {
  readonly searchTerm = signal('');
  readonly busyProviderIds = signal<ReadonlySet<string>>(new Set());
  readonly providerErrors = signal<Readonly<Record<string, string>>>({});
  readonly filteredProviders = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    if (!query) return this.providers;

    return this.providers.filter(({ metadata }) =>
      `${metadata.displayName} ${metadata.description}`.toLocaleLowerCase().includes(query),
    );
  });
  private readonly dialog = inject(Dialog);
  private readonly chatService = inject(ChatService);

  constructor(@Inject(CHAT_PROVIDER) readonly providers: ChatProvider[] = []) {}

  async ngOnInit(): Promise<void> {
    await Promise.all(
      this.providers.map(async (provider) => {
        this.setBusy(provider, true);
        try {
          await provider.authentication.getCurrentUser();
          this.clearError(provider);
        } catch (error) {
          this.setError(provider, error);
        } finally {
          this.setBusy(provider, false);
        }
      }),
    );
  }

  openConnectDialog(provider: ChatProvider): void {
    this.clearError(provider);
    const dialogRef = this.dialog.open<AuthUser | undefined, ProviderConnectDialogData>(
      AnimatedDialogComponent,
      {
        data: { component: ProviderConnectDialogComponent, provider },
        ariaLabel: `Connect ${provider.metadata.displayName}`,
        backdropClass: 'popup-dialog-backdrop',
        disableClose: true,
      },
    );

    dialogRef.closed.subscribe(async (user) => {
      if (!user) return;
      await this.chatService.loadProviderChats(provider);
    });
  }

  async disconnect(provider: ChatProvider): Promise<void> {
    this.setBusy(provider, true);
    this.clearError(provider);
    try {
      await provider.authentication.logout();
      this.chatService.clearChats(provider.metadata.id);
    } catch (error) {
      this.setError(provider, error);
    } finally {
      this.setBusy(provider, false);
    }
  }

  isBusy(provider: ChatProvider): boolean {
    return this.busyProviderIds().has(provider.metadata.id);
  }

  errorFor(provider: ChatProvider): string | undefined {
    return this.providerErrors()[provider.metadata.id];
  }

  actionText(provider: ChatProvider): string {
    if (this.isBusy(provider)) {
      return provider.authentication.loggedIn() ? 'Disconnecting...' : 'Checking...';
    }

    return provider.authentication.loggedIn() ? 'Disconnect' : 'Connect';
  }

  handleAction(provider: ChatProvider): void {
    if (provider.authentication.loggedIn()) {
      void this.disconnect(provider);
      return;
    }

    this.openConnectDialog(provider);
  }

  private setBusy(provider: ChatProvider, busy: boolean): void {
    this.busyProviderIds.update((ids) => {
      const next = new Set(ids);
      if (busy) next.add(provider.metadata.id);
      else next.delete(provider.metadata.id);
      return next;
    });
  }

  private clearError(provider: ChatProvider): void {
    this.providerErrors.update(({ [provider.metadata.id]: _, ...errors }) => errors);
  }

  private setError(provider: ChatProvider, error: unknown): void {
    this.providerErrors.update((errors) => ({
      ...errors,
      [provider.metadata.id]: this.errorMessage(error),
    }));
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
