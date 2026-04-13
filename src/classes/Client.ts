import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";

export class Client {
    private chat: Chat;
    private onMessageAdded?: (message: Message) => void | Promise<void>;
    constructor(chat: Chat){
        this.chat = chat;
    }
    ask(question : Question){
        this.appendMessage(question);
        this.chat.supporter.respond();
    }
    answer(answer : Answer | string){
        answer instanceof Answer ? 
        this.appendMessage(answer) : 
        this.appendMessage(new Answer(answer, 'user'));
        this.chat.supporter.respond();
    }
    setOnMessageAdded(onMessageAdded: (message: Message) => void | Promise<void>) {
        this.onMessageAdded = onMessageAdded;
    }
    private appendMessage(message: Message){
        this.chat.messages.push(message);
        void this.onMessageAdded?.(message);
    }
}
