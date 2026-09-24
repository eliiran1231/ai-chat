import { DIALOG_DATA } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ANIMATED_DIALOG_CONTEXT } from '../../animated-dialog-component/animated-dialog-context.token';

export type AlertDialogKind = 'confirm' | 'prompt';

export interface AlertDialogData {
  kind: AlertDialogKind;
  title?: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  initialValue?: string;
  placeholder?: string;
  inputLabel?: string;
}

@Component({
  selector: 'app-alert-dialog',
  imports: [FormsModule],
  templateUrl: './alert-dialog.html',
  styleUrl: './alert-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDialogComponent {
  readonly data = inject<AlertDialogData>(DIALOG_DATA);
  private readonly dialog = inject(ANIMATED_DIALOG_CONTEXT);
  readonly value = signal(this.data.initialValue ?? '');

  cancel(): void {
    this.dialog.close(this.data.kind === 'confirm' ? false : undefined);
  }

  confirm(): void {
    this.dialog.close(this.data.kind === 'confirm' ? true : this.value());
  }
}
