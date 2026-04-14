import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";

export class Client {
    private chat: Chat;
    public onMessageAdded?: (message: Message) => void | Promise<void>;
    constructor(chat: Chat){
        this.chat = chat;
    }
    ask(question : Question | string){
        question instanceof Question ?
        this.appendMessage(question) :
        this.appendMessage(new Question(question));
        this.chat.supporter.respond();
    }
    answer(answer : Answer | string){
        answer instanceof Answer ? 
        this.appendMessage(answer) : 
        this.appendMessage(new Answer(answer));
        this.chat.supporter.respond();
    }
    setOnMessageAdded(onMessageAdded: (message: Message) => void | Promise<void>) {
        this.onMessageAdded = onMessageAdded;
    }
    private appendMessage(message: Message){
        message.from = "client";
        message.isRead = true;
        this.chat.messages.push(message);
        void this.onMessageAdded?.(message);
    }
}
