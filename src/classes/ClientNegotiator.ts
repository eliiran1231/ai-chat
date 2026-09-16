import { signal, WritableSignal } from '@angular/core';
import type { OperationsNegotiationAnswer, OperationsNegotiator } from '../interfaces/OperationsNegotiator';
import { DeleteProposal, EditProposal, Proposal } from './Proposals';

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

/**
 * Asks the client — the end user — to confirm a proposed edit/delete before it happens.
 * Owned by `Client` (`chat.user.negotiator`), so it's consulted the same way whether the
 * request came from a single `Message.delete()`/`.edit()` or a `MessageCollection` batch.
 * A lone message is common and low-risk enough that it's exempted from the prompt below.
 */
export class ClientNegotiator implements OperationsNegotiator {
  /** The proposal currently awaiting confirmation, if any — read this to highlight it in the UI. */
  readonly activeProposal: WritableSignal<Proposal<any> | undefined> = signal(undefined);

  constructor(
    private readonly confirmProposal: (message: string) => boolean = window.confirm.bind(window),
  ) {}

  negotiateBatchEdit(proposal: EditProposal): Promise<OperationsNegotiationAnswer> {
    return this.negotiate(proposal, 'Accept the proposed edits to the selected messages?');
  }

  negotiateBatchDelete(proposal: DeleteProposal): Promise<OperationsNegotiationAnswer> {
    return this.negotiate(proposal, 'Accept the proposed deletion of the selected messages?');
  }

  private async negotiate(proposal: Proposal<any>, promptMessage: string): Promise<OperationsNegotiationAnswer> {
    if ([...proposal.contents].length <= 1) return true;
    this.activeProposal.set(proposal);
    try {
      await nextPaint();
      return this.confirmProposal(promptMessage);
    } finally {
      this.activeProposal.set(undefined);
    }
  }
}
