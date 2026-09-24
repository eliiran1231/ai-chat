import { OperationsNegotiator } from "../interfaces/OperationsNegotiator";
import { ClientNegotiator } from "./ClientNegotiator";
import { AcceptedProposal, DeleteProposal, EditProposal } from "./Proposals";
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
      for (let i = 0; i < this.maxRounds; i++) {
        const answer = lastProposal instanceof EditProposal
          ? await offerReceiver.negotiateBatchEdit(lastProposal, offerGiver)
          : await offerReceiver.negotiateBatchDelete(lastProposal, offerGiver);
        
        if (answer === true) {
          if (
            offerReceiver === this.clientNegotiator ||
            await this.askClient(lastProposal, offerGiver)
          )
            return lastProposal as AcceptedProposal<T>;
          return null
        }

        if (answer === false) return null;

        lastProposal = answer;
        [offerGiver, offerReceiver] = [offerReceiver, offerGiver]
      }

      return null
    }
    
    async askClient(
      proposal: EditProposal | DeleteProposal,
      offerGiver: OperationsNegotiator,
    ){
      const answer = proposal instanceof EditProposal
          ? await this.clientNegotiator.negotiateBatchEdit(proposal, offerGiver)
          : await this.clientNegotiator.negotiateBatchDelete(proposal, offerGiver);
      return !!answer;
    }
}
