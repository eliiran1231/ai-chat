import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PROVIDER_AUTHENTICATION_DIALOG_CONTEXT } from '../animated-dialog-component/animated-dialog-context.token';
import { TranslatePipe } from '../shared/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-powersync-connect',
  imports: [FormsModule, TranslatePipe],
  templateUrl: './powersync-connect-component.html',
  styleUrl: './powersync-connect-component.scss',
})
export class PowerSyncConnectComponent {
  readonly context = inject(PROVIDER_AUTHENTICATION_DIALOG_CONTEXT);
  private readonly languageService = inject(LanguageService);
  readonly email = signal('');
  readonly password = signal('');
  readonly displayName = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | undefined>(undefined);

  async connect(): Promise<void> {
    if (!this.hasCredentials()) return;

    this.busy.set(true);
    this.error.set(undefined);
    try {
      const user = await this.context.provider.authentication.login({
        email: this.email(),
        password: this.password(),
      });
      this.context.close(user);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.busy.set(false);
    }
  }

  async createAccount(): Promise<void> {
    if (!this.hasCredentials()) return;

    this.busy.set(true);
    this.error.set(undefined);
    try {
      const user = await this.context.provider.authentication.register({
        email: this.email(),
        password: this.password(),
        displayName: this.displayName() || undefined,
      });
      this.context.close(user);
    } catch (error) {
      this.error.set(this.errorMessage(error));
      this.busy.set(false);
    }
  }

  close(): void {
    if (!this.busy()) this.context.close();
  }

  private hasCredentials(): boolean {
    if (this.email() && this.password()) return true;
    this.error.set(this.languageService.translate('provider.credentialsRequired'));
    return false;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
