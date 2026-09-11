import type { WritableSignal } from '@angular/core';
import { MessageCollection } from '../../classes/MessageCollection';
import type { BatchNegotiationAnswer, BatchNegotiator } from '../../interfaces/BatchNegotiator';
import { Proposal } from '../../classes/Proposal';

/**
 * Resolves once the browser has painted at least one frame since it was called.
 *
 * `window.confirm` blocks the main thread synchronously, so the proposal highlight
 * driven by `activeProposal` must already be on screen before we call it — otherwise
 * the user is asked to confirm something they never saw. A single `setTimeout`/microtask
 * tick does NOT guarantee a paint happened in between; two chained `requestAnimationFrame`
 * calls do, because the first fires immediately before the next paint and the second only
 * runs after that paint has completed.
 */
function nextPaint(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export class UserBatchNegotiator implements BatchNegotiator {
  constructor(
    private readonly selection: MessageCollection,
    private readonly activeProposal: WritableSignal<Proposal | undefined>,
    private readonly confirmProposal: (message: string) => boolean = window.confirm.bind(window),
  ) {}

  negotiateBatchEdit(proposal: Proposal): Promise<BatchNegotiationAnswer> {
    return this.negotiate(proposal, 'Accept the proposed edits to the selected messages?');
  }

  negotiateBatchDelete(proposal: Proposal): Promise<BatchNegotiationAnswer> {
    return this.negotiate(proposal, 'Accept the proposed deletion of the selected messages?');
  }

  private async negotiate(proposal: Proposal, promptMessage: string): Promise<BatchNegotiationAnswer> {
    this.showProposal(proposal);
    try {
      await nextPaint();
      return this.confirmProposal(promptMessage) || this.rejectSelection();
    } finally {
      this.hideProposal();
    }
  }

  private showProposal(proposal: Proposal): void {
    this.activeProposal.set(proposal);
  }

  private hideProposal(): void {
    this.activeProposal.set(undefined);
  }

  /** The user declined the whole batch: drop the selection instead of leaving it stranded. */
  private rejectSelection(): false {
    this.selection.clearMessages();
    return false;
  }
}
