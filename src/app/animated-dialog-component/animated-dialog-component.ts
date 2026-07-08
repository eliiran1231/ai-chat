import { NgComponentOutlet } from '@angular/common';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, Injector, signal, Type } from '@angular/core';
import { ANIMATED_DIALOG_CONTEXT } from './animated-dialog-context.token';

export type AnimatedDialogAnimation = 'none' | 'pop';

export interface AnimatedDialogData {
  component: Type<unknown>;
  width?: string;
  height?: string;
  animation?: AnimatedDialogAnimation;
}

@Component({
  selector: 'app-animated-dialog',
  imports: [NgComponentOutlet],
  templateUrl: './animated-dialog-component.html',
  styleUrl: './animated-dialog-component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimatedDialogComponent {
  readonly data = inject<AnimatedDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<unknown>>(DialogRef);
  private readonly injector = inject(Injector);

  readonly isShown = signal(true);
  readonly animation = this.data.animation ?? 'pop';
  readonly enterAnimation = this.animation === 'pop' ? 'provider-dialog-enter' : '';
  readonly leaveAnimation = this.animation === 'pop' ? 'provider-dialog-leave' : '';
  readonly contentInjector = Injector.create({
    parent: this.injector,
    providers: [
      {
        provide: ANIMATED_DIALOG_CONTEXT,
        useValue: { close: (result?: unknown) => this.beginClose(result) },
      },
    ],
  });
  private closeResult: unknown;

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

  private beginClose(result?: unknown): void {
    if (this.animation === 'none') {
      this.dialogRef.close(result);
      return;
    }

    this.closeResult = result;
    this.isShown.set(false);
  }
}
