import { Injectable, Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { ChatManagersService } from "../services/chat-managers.service";
import { MessageStatus } from "../enums/MessagesStatus";

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
        chat.setFileUrlProcessor(this.handleFile.bind(this));
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
        let oldMessage = message.clone();
        message.uiInstance.value = newValue;
        message.uiInstance.editedAt = new Date();
        return this.request(()=>this.onEditRequested(message, oldMessage), message);
    }

    requestDelete(message: Message) {
        return this.request(()=>this.onDeleteRequested(message), message);
    }

    onSendRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    onEditRequested(message: Message, oldMessage: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    onDeleteRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    handleFile(file: File): string | Promise<string> {
        //override to handle file attachments
        return URL.createObjectURL(file);
    }

    onDestroy(): void | Promise<void> {
        
    }
}