import { Answer } from "./Answer";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";

export class User {
    private messages: Message[];
    private supporter: Supporter;
    constructor(messages: Message[], supporter: Supporter){
        this.messages = messages;
        this.supporter = supporter;
    }
    ask(question : Question){
        this.messages.push(question);
        this.supporter.respond();
    }
    answer(answer : Answer){
        this.messages.push(answer);
        this.supporter.respond();
    }
}