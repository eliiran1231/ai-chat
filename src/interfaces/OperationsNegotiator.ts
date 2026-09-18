import { DeleteProposal, EditProposal } from "../classes/Proposals.js";

export type EditNegotiationAnswer = boolean | EditProposal;
export type DeleteNegotiationAnswer = boolean | DeleteProposal;
export interface OperationsNegotiator {
    negotiateBatchEdit(proposal: EditProposal, proposer: OperationsNegotiator): EditNegotiationAnswer | Promise<EditNegotiationAnswer>
    negotiateBatchDelete(proposal: DeleteProposal, proposer: OperationsNegotiator): DeleteNegotiationAnswer | Promise<DeleteNegotiationAnswer>
}