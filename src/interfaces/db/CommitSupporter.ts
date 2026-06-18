import { Uuid } from "./Uuid";

export interface CommitSupporterInput {
    id: Uuid,
    name: string,
    expects: "message" | "question" | "answer",
    context: any
}