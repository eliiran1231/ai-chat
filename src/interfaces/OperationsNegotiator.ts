import { DeleteProposal, EditProposal } from "../classes/Proposals.js";

export type OperationsNegotiationAnswer = boolean | DeleteProposal | EditProposal;
export interface OperationsNegotiator {
    negotiateBatchEdit(proposal: EditProposal, proposer: OperationsNegotiator): OperationsNegotiationAnswer | Promise<OperationsNegotiationAnswer>
    negotiateBatchDelete(proposal: DeleteProposal, proposer: OperationsNegotiator): OperationsNegotiationAnswer | Promise<OperationsNegotiationAnswer>
}