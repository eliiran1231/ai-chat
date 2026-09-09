import { ReadonlySignals } from "../app/types/ReadonlySignals.js";
import { BatchActionStatus } from "../enums/BatchActionStatus.js";
import { Message } from "../classes/Message.js";

export type BatchNegotiationAnswer = {
  type: BatchActionStatus.Approved | BatchActionStatus.Rejected
} | {
  type: BatchActionStatus.CounterOffered
  counterOffer: Set<Message>
}

export interface BatchNegotiator {
    negotiateBatchEdit(proposal: Set<ReadonlySignals<Message>>): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer>
    negotiateBatchDelete(proposal: Set<ReadonlySignals<Message>>): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer>
}