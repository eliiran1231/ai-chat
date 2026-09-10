import { ReadonlySignals } from "../app/types/ReadonlySignals";
import { Message } from "./Message";

type ProposalType = 'edit' | 'delete'
export class Proposal {
    readonly type: ProposalType;
    readonly contents: Set<ReadonlySignals<Message>>;
    constructor(messages: Set<Message>, type: ProposalType){
        this.contents = messages;
        this.type = type;
    }
    
    Accept(){
        return true;
    }
    
    Reject(){
        return false;
    }    
}

export type AcceptedProposal = Proposal & {
    contents: Set<Message>
}
