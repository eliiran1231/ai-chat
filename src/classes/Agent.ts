import { Injector } from "@angular/core";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";

export class Agent{
    chat: Chat = null as any;
    supporter: Supporter = new Supporter();
    lastQuestion?: Question;
    lastMessage?: Message;
    
    constructor(injector: Injector) {}
    
    init(chat : Chat, supporter : Supporter) {
        this.chat = chat;
        this.supporter = supporter;
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
} 