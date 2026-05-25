import { Injector } from "@angular/core";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";
import { Subscription } from "rxjs";

export class Agent {
    chat: Chat = null as any;
    supporter: Supporter = new Supporter();
    lastQuestion?: Question;
    lastMessage?: Message;
    private onMessageDeletedHandler?: Subscription;
    private onMessageEditedHandler?: Subscription;
    private onAnswerSelectedHandler?: Subscription;

    constructor(injector: Injector) { }

    private findLastSupporterQuestion(messages: Message[]): Question | undefined {
        for (let i = this.chat.messages.length - 1; i >= 0; i--) {
            const message = this.chat.messages[i];
            if (message instanceof Question && message.from === 'supporter') {
                return message;
            }
        }
        return undefined;
    }

    init(chat: Chat, supporter: Supporter) {
        this.chat = chat;
        this.supporter = supporter;
        this.lastQuestion = this.findLastSupporterQuestion(chat.messages);
        this.onAnswerSelectedHandler = chat.user.onAnswerSelected.subscribe(({answer, associatedQuestion, associatedQuestionIndex }) => this.onAnswerSelected(answer, associatedQuestion, associatedQuestionIndex as number));
        this.onMessageDeletedHandler = chat.onMessageDeleted.subscribe(this.onMessageDeleted.bind(this));
        this.onMessageEditedHandler = chat.onMessageEdited.subscribe(this.onMessageEdited.bind(this));
        chat.setFileUrlProcessor(this.handleFile.bind(this));
    }

    respond() {
        this.lastMessage = this.chat.messages.at(-1);
        if (!this.lastMessage) {
            throw new Error("respond was called but there is nothing to respond to");
        }
        else if (this.lastMessage.from == "supporter") {
            throw new Error("respond was called but there is nothing to respond to. the last message is from the agent");
        }
        if (this.lastQuestion && this.lastMessage instanceof Answer && !this.lastQuestion?.isAnswerValid(this.lastMessage)) {
            this.onInvalidAnswer(this.lastMessage, this.lastQuestion);
        }
    }

    onInvalidAnswer(answer: Answer, lastQuestion: Question) {
        this.supporter.sendMessage(lastQuestion.validationErrorMessage);
        throw new Error("validation didnt pass");
    }

    onAnswerSelected(answer: Answer, associatedQuestion: Question, associatedQuestionIndex: number) {
        if (associatedQuestionIndex >= this.chat.messages.length - 1) {
            this.chat.user.answer(answer);
            return;
        }
        let responseToEdit;
        for(let i = 1; !(responseToEdit instanceof Answer && responseToEdit.from === "client"); i++){
            responseToEdit = this.chat.messages[associatedQuestionIndex + i];
        }
        console.log(associatedQuestionIndex, this.chat.messages.length, responseToEdit);
        responseToEdit?.edit(answer.value);
    }

    onMessageEdited(message: Message) {
        for (let i = this.chat.messages.length - 1; i >= 0; i--) {
            const msg = this.chat.messages[i];
            if (msg.id === message.id) break;
            msg.delete();
        }
        this.lastQuestion = this.findLastSupporterQuestion(this.chat.messages);
        this.respond();
    }

    onMessageDeleted(message: Message) {
        //override to handle message deletions
    }

    handleFile(file: File): string | Promise<string> {
        //override to handle file attachments
        return URL.createObjectURL(file);
    }

    onDestroy() {
        this.onMessageDeletedHandler?.unsubscribe();
        this.onMessageEditedHandler?.unsubscribe();
        this.onAnswerSelectedHandler?.unsubscribe();
    }
} 