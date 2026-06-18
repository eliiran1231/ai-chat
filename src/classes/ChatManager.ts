import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { MessageStatus } from "../enums/MessagesStatus";
import { DBEntity } from "./DBEntity";
import { ChatProvider } from "../interfaces/ChatProvider";

export class ChatManager {
    protected chat!: Chat;
    private ngZone: NgZone;
    protected chatProvider: ChatProvider;

    constructor(injector: Injector, chatProvider: ChatProvider) {
        this.ngZone = injector.get(NgZone);
        this.chatProvider = chatProvider;
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
        let oldMessage = message.clone();
        message.uiInstance.value = newValue;
        message.uiInstance.editedAt = new Date();
        return this.request(()=>this.onEditRequested(message, oldMessage), message);
    }

    requestDelete(message: Message) {
        return this.request(()=>this.onDeleteRequested(message), message);
    }

    requestChatDelete(){
        return this.chatProvider.deleteChat(this.chat.id);
    }

    requestPropChange(target: DBEntity, prop: string | Symbol | undefined, newValue: any): void | Promise<void>{
        return this.onPropChangeRequested(target, prop, newValue);
    }

    protected onSendRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onEditRequested(message: Message, oldMessage: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onPropChangeRequested(target: DBEntity, prop: string | Symbol | undefined, newValue: any){
        
    }

    protected onDeleteRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    handleFile(file: File): string | Promise<string> {
        //override to handle file attachments
        return URL.createObjectURL(file);
    }
}