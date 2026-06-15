import { dbProperty } from "./DBEntity";
import { Message, MessageOptions } from "./Message";

export type AnswerOptions = MessageOptions & {
    selectedAnswers?: Answer[] | string[];
};

export class Answer extends Message {
    @dbProperty
    selectedAnswers?: Answer[];

    constructor(value: string, options?: AnswerOptions) {
        super(value, options);
        if (options?.selectedAnswers) {
            this.selectedAnswers = options.selectedAnswers.map(answer =>
                answer instanceof Answer ? answer : new Answer(answer)
            );
        }
        this.enableDbChanges();
    }

    override clone(): Answer {
        return new Answer(this.value, { ...this })
    }
}
