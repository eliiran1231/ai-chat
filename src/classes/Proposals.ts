import { ReadonlySignals } from "../app/types/ReadonlySignals";
import { Message } from "./Message";

export interface Proposal<T> {
    readonly contents: Iterable<T>,
}

export class DeleteProposal implements Proposal<ReadonlySignals<Message>>{
    readonly contents: Set<ReadonlySignals<Message>>;
    constructor(contents?: Set<Message>){
        this.contents = contents ?? new Set();
    }
}

export type EditCandidate = {
    newMessage: Message,
    oldMessage: ReadonlySignals<Message>
}

export type AcceptedEditCandidate = {
    newMessage: Message,
    oldMessage: Message
}

export class EditProposal implements Proposal<EditCandidate>{
    readonly contents: ReadonlySet<EditCandidate>
    constructor(contents?: Set<EditCandidate>){
        this.contents = contents ?? new Set();
    }
}

export type AcceptedProposal<T> = {
    contents: Set<T extends EditProposal ? AcceptedEditCandidate : Message>
}