import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';

import {
  AnimatedDialogComponent,
  type AnimatedDialogData,
} from '../app/animated-dialog-component/animated-dialog-component';
import { AlertDialogComponent, type AlertDialogData } from '../app/shared/alert-dialog/alert-dialog';
import { AlertToastComponent, type AlertToastData } from '../app/shared/alert-toast/alert-toast';
import type { AlertConfirmOptions } from '../interfaces/alerts/AlertConfirmOptions';
import type { AlertPromptOptions } from '../interfaces/alerts/AlertPromptOptions';
import type { AlertToastOptions } from '../interfaces/alerts/AlertToastOptions';

export type { AlertConfirmOptions } from '../interfaces/alerts/AlertConfirmOptions';
export type { AlertPromptOptions } from '../interfaces/alerts/AlertPromptOptions';
export type { AlertToastOptions } from '../interfaces/alerts/AlertToastOptions';

type AlertOptions = AlertConfirmOptions | AlertPromptOptions;
type AlertAnimatedDialogData = AlertDialogData & AnimatedDialogData;

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly dialog = inject(Dialog);
  private activeToast?: DialogRef<void>;
  private toastTimer?: ReturnType<typeof setTimeout>;

  confirm(message: string, options?: Omit<AlertConfirmOptions, 'message'>): Promise<boolean>;
  confirm(options: AlertConfirmOptions): Promise<boolean>;
  confirm(
    messageOrOptions: string | AlertConfirmOptions,
    options: Omit<AlertConfirmOptions, 'message'> = {},
  ): Promise<boolean> {
    const data = this.toOptions(messageOrOptions, options);
    return firstValueFrom(this.openDialog('confirm', data).closed.pipe(map((result) => result === true)));
  }

  prompt(message: string, options?: Omit<AlertPromptOptions, 'message'>): Promise<string | undefined>;
  prompt(options: AlertPromptOptions): Promise<string | undefined>;
  prompt(
    messageOrOptions: string | AlertPromptOptions,
    options: Omit<AlertPromptOptions, 'message'> = {},
  ): Promise<string | undefined> {
    const data = this.toOptions(messageOrOptions, options);
    return firstValueFrom(this.openDialog('prompt', data).closed.pipe(map((result) =>
      typeof result === 'string' ? result : undefined,
    )));
  }

  toast(message: string, options?: Omit<AlertToastOptions, 'message'>): void;
  toast(options: AlertToastOptions): void;
  toast(
    messageOrOptions: string | AlertToastOptions,
    options: Omit<AlertToastOptions, 'message'> = {},
  ): void {
    const toast = typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, ...options }
      : messageOrOptions;
    this.activeToast?.close();
    clearTimeout(this.toastTimer);

    const ref = this.dialog.open<void, AlertToastData>(AlertToastComponent, {
      data: { message: toast.message },
      hasBackdrop: false,
      disableClose: true,
      panelClass: 'alert-toast-panel',
      ariaLabel: toast.message,
    });
    this.activeToast = ref;
    const dismiss = () => {
      if (this.activeToast === ref) this.activeToast = undefined;
      clearTimeout(this.toastTimer);
    };
    ref.closed.subscribe(dismiss);
    this.toastTimer = setTimeout(() => ref.close(), toast.duration ?? 4_000);
  }

  private openDialog(kind: AlertDialogData['kind'], options: AlertOptions): DialogRef<unknown> {
    const data: AlertDialogData = {
      kind,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? (kind === 'confirm' ? 'OK' : 'Save'),
      cancelText: options.cancelText ?? 'Cancel',
      initialValue: 'initialValue' in options ? options.initialValue : undefined,
      placeholder: 'placeholder' in options ? options.placeholder : undefined,
      inputLabel: 'inputLabel' in options ? options.inputLabel : undefined,
    };
    return this.dialog.open<unknown, AlertAnimatedDialogData>(AnimatedDialogComponent, {
      data: {
        ...data,
        component: AlertDialogComponent,
        width: 'min(calc(100vw - 2rem), 24rem)',
      },
      backdropClass: 'popup-dialog-backdrop',
      disableClose: true,
    });
  }

  private toOptions<T extends AlertOptions>(
    messageOrOptions: string | T,
    options: Omit<T, 'message'>,
  ): T {
    return (typeof messageOrOptions === 'string'
      ? { message: messageOrOptions, ...options }
      : messageOrOptions) as T;
  }
}
