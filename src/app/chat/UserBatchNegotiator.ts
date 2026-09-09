import { MessageCollection } from '../../classes/MessageCollection';
import type { BatchNegotiationAnswer, BatchNegotiator } from '../../interfaces/BatchNegotiator';
import type { ReadonlySignals } from '../types/ReadonlySignals';
import type { Message } from '../../classes/Message';
import { BatchActionStatus } from '../../enums/BatchActionStatus';

export class UserBatchNegotiator implements BatchNegotiator {
  constructor(
    private readonly selection: MessageCollection,
    private readonly confirmProposal: (message: string) => boolean = window.confirm.bind(window),
  ) {}

  negotiateBatchEdit(proposal: Set<ReadonlySignals<Message>>): BatchNegotiationAnswer {
    return this.negotiate(proposal, 'Accept the proposed edits to the selected messages?');
  }

  negotiateBatchDelete(proposal: Set<ReadonlySignals<Message>>): BatchNegotiationAnswer {
    return this.negotiate(proposal, 'Accept the proposed deletion of the selected messages?');
  }

  private negotiate(
    proposal: Set<ReadonlySignals<Message>>,
    promptMessage: string,
  ): BatchNegotiationAnswer {
    this.selection.selectMessages(proposal as unknown as Set<Message>);
    if (this.confirmProposal(promptMessage)) {
      return { type: BatchActionStatus.Approved };
    }

    this.selection.clearMessages();
    return { type: BatchActionStatus.Rejected };
  }
}
