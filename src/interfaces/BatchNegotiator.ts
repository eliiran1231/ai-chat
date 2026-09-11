import { Proposal } from "../classes/Proposal.js";

export type BatchNegotiationAnswer = boolean | Proposal;
export interface BatchNegotiator {
    negotiateBatchEdit(proposal: Proposal): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer>
    negotiateBatchDelete(proposal: Proposal): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer>
}