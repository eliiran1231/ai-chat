import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";

type MessageAddedListener = (message: Message) => void | Promise<void>;

export class Client {
    private readonly chat: Chat;
    private readonly messageAddedListeners = new Set<MessageAddedListener>();
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

    subscribeOnMessageAdded(onMessageAdded: MessageAddedListener): () => void {
        this.messageAddedListeners.add(onMessageAdded);
        return () => {
            this.messageAddedListeners.delete(onMessageAdded);
        };
    }

    setOnMessageAdded(onMessageAdded: MessageAddedListener): () => void {
        return this.subscribeOnMessageAdded(onMessageAdded);
    }

    private appendMessage(message: Message){
        message.from = "client";
        message.isRead = true;
        this.chat.messages.push(message);
        this.messageAddedListeners.forEach((listener) => {
            void listener(message);
        });
    }
}
