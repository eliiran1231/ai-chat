import { OperationsNegotiator } from "../interfaces/OperationsNegotiator";
import { ClientNegotiator } from "./ClientNegotiator";
import { AcceptedProposal, DeleteProposal, EditProposal, Proposal } from "./Proposals";
export class OperationsNegotiationMediator {
    private maxRounds = 10;
    constructor(
      private clientNegotiator: ClientNegotiator
    ){}
    async negotiate<T>(
        initialOffer: DeleteProposal | EditProposal,
        offerGiver: OperationsNegotiator,
        offerReceiver: OperationsNegotiator,
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

    async askClient(proposal: EditProposal | DeleteProposal){
      const answer = proposal instanceof EditProposal
          ? await this.clientNegotiator.negotiateBatchEdit(proposal)
          : await this.clientNegotiator.negotiateBatchDelete(proposal);
      return !!answer;
    }
}