import { Subject } from "rxjs";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { MessageStatus } from "../enums/MessagesStatus";
import { ClientNegotiator } from "./ClientNegotiator";
import { MessageCollection } from "./MessageCollection";

export type AnswerSelectedEvent = {
    answer: Answer | Answer[];
    associatedQuestion: Question;
    associatedQuestionIndex: number;
}

export class Client {
    private chat: Chat;
    public readonly onMessageAdded = new Subject<Message>();
    public readonly onAnswerSelected = new Subject<AnswerSelectedEvent>();
    public readonly negotiator: ClientNegotiator;
    constructor(chat: Chat, negotiator: ClientNegotiator){
        this.chat = chat;
        this.negotiator = negotiator;
    }
    ask(question : Question | string){
        question = question instanceof Question ?
        question :
        new Question(question);
        return this.appendMessage(question);
    }
    answer(answer : Answer | string){
        answer = answer instanceof Answer ? 
        answer :
        new Answer(answer)
        return this.appendMessage(answer);
    }

    createMessageCollection(): MessageCollection{
        return new MessageCollection(this.chat, this.negotiator)
    }

    private async appendMessage(message: Message){
        message.from.set({ type: 'client' });
        message.setChat(this.chat);
        this.chat.messages.update(msgs => [...msgs, message]);
        message.status.set(await this.chat['manager'].requestMessageSend(message));
        if (message.status() === MessageStatus.Failed) {
            return false;
        }
        this.onMessageAdded.next(message);
        this.chat.supporter.respond()
        
        return true;
    }
}
