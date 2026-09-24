import { Dialog } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { AnimatedDialogComponent } from '../app/animated-dialog-component/animated-dialog-component';
import { AlertDialogComponent } from '../app/shared/alert-dialog/alert-dialog';
import { AlertToastComponent } from '../app/shared/alert-toast/alert-toast';
import { AlertService } from './alert.service';

type DialogRefStub = {
  closed: Subject<unknown>;
  close: ReturnType<typeof vi.fn>;
};

function createDialogRef(): DialogRefStub {
  return { closed: new Subject<unknown>(), close: vi.fn() };
}

describe('AlertService', () => {
  let dialog: { open: ReturnType<typeof vi.fn> };
  let service: AlertService;

  beforeEach(() => {
    dialog = { open: vi.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: Dialog, useValue: dialog }] });
    service = TestBed.inject(AlertService);
  });

  it('opens an Android-style confirmation dialog and resolves the selected result', async () => {
    const ref = createDialogRef();
    dialog.open.mockReturnValue(ref);

    const answer = service.confirm('Delete this conversation?', {
      title: 'Delete conversation',
      confirmText: 'Delete',
      cancelText: 'Keep',
    });

    expect(dialog.open).toHaveBeenCalledWith(AnimatedDialogComponent, expect.objectContaining({
      data: expect.objectContaining({
        component: AlertDialogComponent,
        kind: 'confirm',
        message: 'Delete this conversation?',
        confirmText: 'Delete',
        cancelText: 'Keep',
      }),
      disableClose: true,
    }));
    ref.closed.next(true);
    ref.closed.complete();
    await expect(answer).resolves.toBe(true);
  });

  it('returns prompt text and turns a dismissed prompt into undefined', async () => {
    const accepted = createDialogRef();
    const dismissed = createDialogRef();
    dialog.open.mockReturnValueOnce(accepted).mockReturnValueOnce(dismissed);

    const entered = service.prompt({
      title: 'Rename chat',
      message: 'Choose a name',
      initialValue: 'Untitled',
      placeholder: 'Chat name',
      confirmText: 'Rename',
    });
    expect(dialog.open).toHaveBeenLastCalledWith(AnimatedDialogComponent, expect.objectContaining({
      data: expect.objectContaining({ kind: 'prompt', initialValue: 'Untitled', placeholder: 'Chat name' }),
    }));
    accepted.closed.next('Project notes');
    accepted.closed.complete();
    await expect(entered).resolves.toBe('Project notes');

    const cancelled = service.prompt('Choose a name');
    dismissed.closed.next(undefined);
    dismissed.closed.complete();
    await expect(cancelled).resolves.toBeUndefined();
  });

  it('shows one transient toast at a time and dismisses it after its duration', () => {
    vi.useFakeTimers();
    const first = createDialogRef();
    const second = createDialogRef();
    dialog.open.mockReturnValueOnce(first).mockReturnValueOnce(second);

    service.toast('Saved', { duration: 1_000 });
    expect(dialog.open).toHaveBeenCalledWith(AlertToastComponent, expect.objectContaining({
      data: { message: 'Saved' },
      hasBackdrop: false,
      panelClass: 'alert-toast-panel',
    }));

    service.toast({ message: 'Saved again', duration: 500 });
    expect(first.close).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(499);
    expect(second.close).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(second.close).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
