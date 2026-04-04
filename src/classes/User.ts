import { Answer } from "./Answer";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";

export class User {
    private messages: Message[];
    private supporter: Supporter;
    private onMessageAdded?: (message: Message) => void | Promise<void>;
    constructor(messages: Message[], supporter: Supporter){
        this.messages = messages;
        this.supporter = supporter;
    }
    ask(question : Question){
        this.appendMessage(question);
        this.supporter.respond();
    }
    answer(answer : Answer | string){
        answer instanceof Answer ? 
        this.appendMessage(answer) : 
        this.appendMessage(new Answer(answer, 'user'));
        this.supporter.respond();
    }
    setOnMessageAdded(onMessageAdded: (message: Message) => void | Promise<void>) {
        this.onMessageAdded = onMessageAdded;
    }
    private appendMessage(message: Message){
        this.messages.push(message);
        void this.onMessageAdded?.(message);
    }
}
