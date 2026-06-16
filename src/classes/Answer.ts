import { Message, MessageOptions } from "./Message";

export class Answer extends Message {
    constructor(value: string, options?: MessageOptions) {
        super(value, options);
        this.enableDbChanges();
    }

    override clone(): Answer {
        return new Answer(this.value, { ...this });
    }
}
