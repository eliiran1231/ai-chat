import { BatchActionStatus } from "../enums/BatchActionStatus";
import { BatchNegotiator } from "../interfaces/BatchNegotiator";
import { Message } from "./Message";
import { AcceptedProposal, Proposal } from "./Proposal";
export class BatchNegotiationMediator {
    private maxRounds = 10;
    async negotiate(
        initialOffer: Proposal,
        offerGiver: BatchNegotiator,
        offerReceiver: BatchNegotiator
    ): Promise<AcceptedProposal | null> {
      let lastProposal = initialOffer;
      for(let i = 0; i < this.maxRounds; i++){
        const answer = lastProposal.type === 'edit'
          ? await offerReceiver.negotiateBatchEdit(lastProposal)
          : await offerReceiver.negotiateBatchDelete(lastProposal);
        if (answer === true) return lastProposal as AcceptedProposal;
        if (answer === false) return null;
        lastProposal = answer;
        [offerGiver, offerReceiver] = [offerReceiver, offerGiver]
      }
      return null
    }
}