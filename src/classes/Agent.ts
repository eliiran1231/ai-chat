import { Injector } from "@angular/core";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";
import { Subscription } from "rxjs";

export class Agent{
    chat: Chat = null as any;
    supporter: Supporter = new Supporter();
    lastQuestion?: Question;
    lastMessage?: Message;
    private onMessageDeletedHandler?: Subscription;
    private onMessageEditedHandler?: Subscription;
    private onDestroyHandler?: Subscription;

    constructor(injector: Injector) {}

    private findLastSupporterQuestion(messages: Message[]): Question | undefined {
        for (let i = this.chat.messages.length - 1; i >= 0; i--) {
            const message = this.chat.messages[i];
            if (message instanceof Question && message.from === 'supporter') {
                return message;
            }
        }
        return undefined;
    }
    
    init(chat : Chat, supporter : Supporter) {
        this.chat = chat;
        this.supporter = supporter;
        this.lastQuestion = this.findLastSupporterQuestion(chat.messages);
        this.onMessageDeletedHandler = chat.onMessageDeleted.subscribe(this.onMessageDeleted.bind(this));
        this.onMessageEditedHandler = chat.onMessageEdited.subscribe(this.onMessageEdited.bind(this));
        chat.setFileUrlProcessor(this.handleFile);
        this.onDestroyHandler = supporter.onAgentSwitch.subscribe(this.onDestroy.bind(this));
    }

    respond() {
        this.lastMessage = this.chat.messages.at(-1);
        if (!this.lastMessage) {
            throw new Error("respond was called but there is nothing to respond to");
        }
        else if(this.lastMessage.from == "supporter"){
            throw new Error("respond was called but there is nothing to respond to. the last message is from the agent");
        }
        if(this.lastQuestion && this.lastMessage instanceof Answer && !this.lastQuestion?.isAnswerValid(this.lastMessage)){
            this.onInvalidAnswer(this.lastMessage, this.lastQuestion);
        }
    }

    onInvalidAnswer(answer: Answer, lastQuestion: Question){
        this.supporter.sendMessage(lastQuestion.validationErrorMessage);
        throw new Error("validation didnt pass");
    }

    onMessageEdited(message: Message){
        return;
        for (let i = this.chat.messages.length - 1; i >= 0; i--) {
            const msg = this.chat.messages[i];
            if (msg.id === message.id) break;
            msg.delete();
        }
        this.lastQuestion = this.findLastSupporterQuestion(this.chat.messages);
        this.respond();
    }

    onMessageDeleted(message: Message){
        //override to handle message deletions
    }

    handleFile(file: File): string | Promise<string>{
        //override to handle file attachments
        return URL.createObjectURL(file);
    }

    onDestroy(){
        this.onMessageDeletedHandler?.unsubscribe();
        this.onMessageEditedHandler?.unsubscribe();
        this.onDestroyHandler?.unsubscribe();
    }
} 