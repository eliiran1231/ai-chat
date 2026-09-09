import { BatchActionStatus } from "../enums/BatchActionStatus";
import { BatchNegotiator } from "../interfaces/BatchNegotiator";

import { Message } from "./Message";

type Offerer = 'manager' | 'requester';
type BatchAction = 'edit' | 'delete';

export class BatchNegotiationMediator {
    lastOfferDetails: { from: Offerer, offer: Set<Message> };
    constructor(initialOffer: Set<Message>){
        this.lastOfferDetails = { from: 'requester', offer: initialOffer };
    }
    async mediateBatchActionNegotiation(
        action: BatchAction,
        managerNegotiator: BatchNegotiator,
        requesterNegotiator: BatchNegotiator
    ): Promise<Set<Message> | null>{
      let offerReceiver;
      let nextOfferFrom: Offerer;
      if(this.lastOfferDetails.from == 'requester'){
        nextOfferFrom = 'manager';
        offerReceiver = managerNegotiator;
      }
      else {
        nextOfferFrom = 'requester';
        offerReceiver = requesterNegotiator;
      }
      const answer = action === 'edit'
        ? await offerReceiver.negotiateBatchEdit(this.lastOfferDetails.offer)
        : await offerReceiver.negotiateBatchDelete(this.lastOfferDetails.offer);
      if (answer.type == BatchActionStatus.Approved) return this.lastOfferDetails.offer;
      if (answer.type == BatchActionStatus.Rejected || answer.type != BatchActionStatus.CounterOffered) return null;
      this.lastOfferDetails = { from: nextOfferFrom, offer: answer.counterOffer };
      return this.mediateBatchActionNegotiation(action, managerNegotiator, requesterNegotiator);
    }
}