import { DeleteProposal, EditProposal } from "../classes/Proposals.js";

export type BatchNegotiationAnswer = boolean | DeleteProposal | EditProposal;
export interface BatchNegotiator {
    negotiateBatchEdit(proposal: EditProposal): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer>
    negotiateBatchDelete(proposal: DeleteProposal): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer>
}