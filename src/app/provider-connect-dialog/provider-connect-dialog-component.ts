import { NgComponentOutlet } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, Injector, signal } from '@angular/core';
import { ChatProvider } from '../../interfaces/ChatProvider';
import { AuthUser } from '../../interfaces/auth/AuthUser';
import { PROVIDER_AUTHENTICATION_DIALOG_CONTEXT } from './provider-authentication-dialog-context.token';

export interface ProviderConnectDialogData {
  provider: ChatProvider;
}

@Component({
  selector: 'app-provider-connect-dialog',
  imports: [NgComponentOutlet],
  templateUrl: './provider-connect-dialog-component.html',
  styleUrl: './provider-connect-dialog-component.scss',
})
export class ProviderConnectDialogComponent {
  readonly data = inject<ProviderConnectDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<AuthUser | undefined>>(DialogRef);
  private readonly injector = inject(Injector);

  readonly isShown = signal(true);
  readonly authenticationInjector = Injector.create({
    parent: this.injector,
    providers: [
      {
        provide: PROVIDER_AUTHENTICATION_DIALOG_CONTEXT,
        useValue: {
          provider: this.data.provider,
          close: (user?: AuthUser) => this.beginClose(user),
        },
      },
    ],
  });
  private closeResult: AuthUser | undefined;

  constructor() {
    this.dialogRef.backdropClick.subscribe(() => this.beginClose());
    this.dialogRef.keydownEvents.subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.beginClose();
    });
  }

  finishClose(): void {
    if (this.isShown()) return;
    this.dialogRef.close(this.closeResult);
  }

  private beginClose(result?: AuthUser): void {
    this.closeResult = result;
    this.isShown.set(false);
  }
}
