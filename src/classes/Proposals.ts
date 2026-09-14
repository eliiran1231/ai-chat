import { ReadonlySignals } from "../app/types/ReadonlySignals";
import { Message } from "./Message";

export interface Proposal {
    readonly contents: Iterable<any>,
}

export class DeleteProposal implements Proposal{
    readonly contents: Set<ReadonlySignals<Message>>;
    constructor(contents?: Set<Message>){
        this.contents = contents ?? new Set();
    }
}

export type EditCandidate = {
    newMessage: ReadonlySignals<Message>,
    oldMessage: ReadonlySignals<Message>
}

export type AcceptedEditCandidate = {
    newMessage: Message,
    oldMessage: Message
}

export class EditProposal implements Proposal{
    readonly contents: ReadonlySet<EditCandidate>
    constructor(contents?: Set<EditCandidate>){
        this.contents = contents ?? new Set();
    }
}

export type AcceptedProposal<T> = {
    contents: Set<T extends EditProposal ? AcceptedEditCandidate : Message>
}