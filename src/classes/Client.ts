import { Subject } from "rxjs";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { MessageStatus } from "../enums/MessagesStatus";

export type AnswerSelectedEvent = {
    answer: Answer;
    associatedQuestion: Question;
    associatedQuestionIndex: number;
}

export class Client {
    private chat: Chat;
    public readonly onMessageAdded = new Subject<Message>();
    public readonly onAnswerSelected = new Subject<AnswerSelectedEvent>();
    constructor(chat: Chat){
        this.chat = chat;
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
    private async appendMessage(message: Message){
        message.from.set("client");
        message.setChat(this.chat);
        this.chat.messages.update(msgs => [...msgs, message]);
        message.status.set(await this.chat['manager'].requestSend(message));
        if (message.status() === MessageStatus.Failed) {
            return false;
        }
        this.onMessageAdded.next(message);
        this.chat.supporter.respond()
        
        return true;
    }
}
