import { Subject } from "rxjs";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";

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
    async ask(question : Question | string){
        question = question instanceof Question ?
        question :
        new Question(question);
        return this.appendMessage(question);
    }
    async answer(answer : Answer | string){
        answer = answer instanceof Answer ? 
        answer :
        new Answer(answer)
        return this.appendMessage(answer);
    }
    private async appendMessage(message: Message){
        message.from = "client";
        message.setChat(this.chat);
        message.isRead = true;
        if(await this.chat.manager?.onSendRequested(message) === false) return false;
        this.chat.messages.push(message);
        this.onMessageAdded.next(message);
        this.chat.supporter.respond()
        return true;
    }
}
