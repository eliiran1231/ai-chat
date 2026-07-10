import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ANIMATED_DIALOG_CONTEXT } from '../../animated-dialog-component/animated-dialog-context.token';
import { AnimatedDialogData } from '../../animated-dialog-component/animated-dialog-component';

export interface ConfirmationDialogData extends AnimatedDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
  readonly data = inject<ConfirmationDialogData>(DIALOG_DATA);
  private readonly dialog = inject(ANIMATED_DIALOG_CONTEXT);

  cancel(): void {
    this.dialog.close(false);
  }

  confirm(): void {
    this.dialog.close(true);
  }
}
