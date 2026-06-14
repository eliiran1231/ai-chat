import { Message } from "./Message";

export class Answer extends Message {
    constructor(value: string, options?: any) {
        super(value, options);
        this.enableDbChanges();
    }

    override clone(): Answer {
        return new Answer(this.value, { ...this })
    }
}
