import { signal, WritableSignal } from '@angular/core';
import type { DeleteNegotiationAnswer, EditNegotiationAnswer, OperationsNegotiator } from '../interfaces/OperationsNegotiator';
import type { AlertService } from '../services/alert.service';
import type { LanguageService } from '../services/language.service';
import { DeleteProposal, EditProposal, Proposal } from './Proposals';

/** Confirms batch actions through the application's CDK-based alert service. */
export class ClientNegotiator implements OperationsNegotiator {
  readonly activeProposal: WritableSignal<Proposal<any> | undefined> = signal(undefined);

  constructor(
    private readonly alerts: Pick<AlertService, 'confirm'>,
    private readonly language: Pick<LanguageService, 'translate'>,
  ) {}

  negotiateBatchEdit(proposal: EditProposal, proposer: OperationsNegotiator): Promise<EditNegotiationAnswer> {
    if (proposer === this) return Promise.resolve(true);
    return this.negotiate(proposal, 'chat.confirmEdits');
  }

  negotiateBatchDelete(proposal: DeleteProposal, proposer: OperationsNegotiator): Promise<DeleteNegotiationAnswer> {
    return this.negotiate(proposal, 'chat.confirmDeletion');
  }

  private async negotiate(proposal: Proposal<any>, messageKey: string): Promise<boolean> {
    this.activeProposal.set(proposal);
    try {
      return await this.alerts.confirm({
        title: this.language.translate(
          proposal instanceof EditProposal ? 'chat.confirmEditsTitle' : 'chat.confirmDeletionTitle',
        ),
        message: this.language.translate(messageKey),
        confirmText: this.language.translate('common.confirm'),
        cancelText: this.language.translate('common.cancel'),
      });
    } finally {
      this.activeProposal.set(undefined);
    }
  }
}
