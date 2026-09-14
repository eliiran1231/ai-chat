import { BatchNegotiationAnswer, BatchNegotiator } from "../interfaces/BatchNegotiator";
import { ClientNegotiator } from "./ClientNegotiator";
import { AcceptedProposal, DeleteProposal, EditProposal, Proposal } from "./Proposals";
export class BatchNegotiationMediator {
    private maxRounds = 10;
    constructor(
      private clientNegotiator: ClientNegotiator
    ){}
    async negotiate<T>(
        initialOffer: DeleteProposal | EditProposal,
        offerGiver: BatchNegotiator,
        offerReceiver: BatchNegotiator,
    ): Promise<AcceptedProposal<T> | null> {
      let lastProposal = initialOffer;
      for(let i = 0; i < this.maxRounds; i++){
        const answer = lastProposal instanceof EditProposal
          ? await offerReceiver.negotiateBatchEdit(lastProposal)
          : await offerReceiver.negotiateBatchDelete(lastProposal);
        
        if (answer === true) return await this.askClient(lastProposal) 
          ? lastProposal as AcceptedProposal<T>
          : null;
        
        if (answer === false) return null;

        lastProposal = answer;
        [offerGiver, offerReceiver] = [offerReceiver, offerGiver]
      }

      return null
    }

    async askClient(proposal: Proposal){
      const answer = proposal instanceof EditProposal
          ? await this.clientNegotiator.negotiateBatchEdit(proposal)
          : await this.clientNegotiator.negotiateBatchDelete(proposal as DeleteProposal);
      return !!answer;
    }
}