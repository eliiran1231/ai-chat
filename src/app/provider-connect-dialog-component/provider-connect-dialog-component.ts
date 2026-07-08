import { NgComponentOutlet } from '@angular/common';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, Injector } from '@angular/core';
import type { AuthUser } from '../../../shared/auth/AuthUser';
import { ChatProvider } from '../../interfaces/ChatProvider';
import {
  ANIMATED_DIALOG_CONTEXT,
  PROVIDER_AUTHENTICATION_DIALOG_CONTEXT,
} from '../animated-dialog-component/animated-dialog-context.token';
import { AnimatedDialogData } from '../animated-dialog-component/animated-dialog-component';

export interface ProviderConnectDialogData extends AnimatedDialogData {
  provider: ChatProvider;
}

@Component({
  selector: 'app-provider-connect-dialog',
  imports: [NgComponentOutlet],
  template: `
    <ng-container
      *ngComponentOutlet="data.provider.metadata.authenticationComponent; injector: authenticationInjector"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProviderConnectDialogComponent {
  readonly data = inject<ProviderConnectDialogData>(DIALOG_DATA);
  private readonly animatedDialog = inject(ANIMATED_DIALOG_CONTEXT);
  private readonly injector = inject(Injector);

  readonly authenticationInjector = Injector.create({
    parent: this.injector,
    providers: [
      {
        provide: PROVIDER_AUTHENTICATION_DIALOG_CONTEXT,
        useValue: {
          provider: this.data.provider,
          close: (user?: AuthUser) => this.animatedDialog.close(user),
        },
      },
    ],
  });
}
