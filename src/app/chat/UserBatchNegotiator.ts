import { MessageCollection } from '../../classes/MessageCollection';
import type { BatchNegotiationAnswer, BatchNegotiator } from '../../interfaces/BatchNegotiator';
import type { ReadonlySignals } from '../types/ReadonlySignals';
import { Message } from '../../classes/Message';
import { BatchActionStatus } from '../../enums/BatchActionStatus';
import { Proposal } from '../../classes/Proposal';

export class UserBatchNegotiator implements BatchNegotiator {
  constructor(
    private readonly selection: MessageCollection,
    private readonly confirmProposal: (message: string) => boolean = window.confirm.bind(window),
  ) {}

  negotiateBatchEdit(proposal: Proposal): BatchNegotiationAnswer {
    return this.negotiate(proposal, 'Accept the proposed edits to the selected messages?');
  }

  negotiateBatchDelete(proposal: Proposal): BatchNegotiationAnswer {
    return this.negotiate(proposal, 'Accept the proposed deletion of the selected messages?');
  }

  private negotiate(
    proposal: Proposal,
    promptMessage: string,
  ): BatchNegotiationAnswer {
    this.selection.clearMessages();
    this.selection; //need to select the messages from the proposal
    if (this.confirmProposal(promptMessage)) {
      return true;
    }

    this.selection.clearMessages();
    return false;
  }
}
