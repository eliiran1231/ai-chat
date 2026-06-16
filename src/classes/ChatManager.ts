import { Injectable, Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { ChatManagersService } from "../services/chat-managers.service";
import { MessageStatus } from "../enums/MessagesStatus";

//TODO: make it injectable
//get rid of the ngZone
@Injectable({
    providedIn: 'root'
})
export class ChatManager {
    protected chat!: Chat;
    private _name?: string;


    constructor(private chatManagersService: ChatManagersService, private ngZone: NgZone) {
    }

    set name(name: string) {
        if (this._name) throw new Error("this chat manager name was already set and cannot be changed");
        this._name = name;
    }

    get name(): string {
        if (!this._name) this._name = this.chatManagersService.getManagerName(this);
        return this._name;
    }

    init(chat: Chat): void | Promise<void>{
        this.chat = chat;
    }

    private async request(func: () => MessageStatus | Promise<MessageStatus>, message: Message){   
        message.uiInstance.status = MessageStatus.Pending
        let status = await func();
        return this.ngZone.run(() => {
            message.uiInstance.status = status;
            return status;
        });
    }

    requestSend(message: Message) {
        return this.request(()=>this.onSendRequested(message), message);
    }

    requestEdit(message: Message, newValue: string) {
        message.uiInstance.value = newValue;
        message.uiInstance.editedAt = new Date();
        return this.request(()=>this.onEditRequested(message, newValue), message);
    }

    requestDelete(message: Message) {
        return this.request(()=>this.onDeleteRequested(message), message);
    }

    onSendRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    onEditRequested(message: Message, newValue: string): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    onDeleteRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    onDestroy(): void | Promise<void> {
        
    }
}