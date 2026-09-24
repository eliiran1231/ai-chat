import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

export interface AlertToastData {
  message: string;
}

@Component({
  selector: 'app-alert-toast',
  templateUrl: './alert-toast.html',
  styleUrl: './alert-toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertToastComponent {
  readonly data = inject<AlertToastData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<void>>(DialogRef);

  dismiss(): void {
    this.dialogRef.close();
  }
}
