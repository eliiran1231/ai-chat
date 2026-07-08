import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';

import { AnimatedDialogComponent } from '../../animated-dialog-component/animated-dialog-component';
import { ConfirmationDialogComponent, ConfirmationDialogData } from './confirmation-dialog';

export type ConfirmationDialogOptions = Omit<ConfirmationDialogData, 'component'>;

@Injectable({
  providedIn: 'root',
})
export class ConfirmationDialogService {
  private readonly dialog = inject(Dialog);

  confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    const dialogRef = this.dialog.open<boolean | undefined, ConfirmationDialogData>(
      AnimatedDialogComponent,
      {
        data: {
          ...options,
          component: ConfirmationDialogComponent,
          width: options.width ?? 'min(calc(100vw - 2rem), 24rem)',
        },
        ariaLabel: options.title,
        backdropClass: 'popup-dialog-backdrop',
        disableClose: true,
      },
    );

    return firstValueFrom(dialogRef.closed.pipe(map((result) => result === true)));
  }
}
