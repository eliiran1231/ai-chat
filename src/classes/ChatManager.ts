import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { MessageStatus } from "../enums/MessagesStatus";
import { SyncedEntity } from "./SyncedEntity";
import { ChatProvider } from "../interfaces/ChatProvider";

export class ChatManager {
    protected chat!: Chat;
    protected chatProvider: ChatProvider;

    constructor(injector: Injector, chatProvider: ChatProvider) {
        this.chatProvider = chatProvider;
    }

    init(chat: Chat): void | Promise<void>{
        this.chat = chat;
    }

    private async request(func: () => MessageStatus | Promise<MessageStatus>, message: Message){   
        message.status.set(MessageStatus.Pending, true);
        let status = await func();
        return status;
    }

    requestSend(message: Message) {
        return this.request(()=>this.onSendRequested(message), message);
    }

    requestEdit(message: Message, newValue: string) {
        let oldMessage = message.clone();
        message.value.set(newValue, true);
        message.editedAt.set(new Date(), true);
        return this.request(()=>this.onEditRequested(message, oldMessage), message);
    }

    requestDelete(message: Message) {
        return this.request(()=>this.onDeleteRequested(message), message);
    }

    requestChatDelete(){
        return this.chatProvider.deleteChat(this.chat.id());
    }

    requestPropChange(target: SyncedEntity, prop: string | Symbol | undefined, newValue: any): void | Promise<void>{
        return this.onPropChangeRequested(target, prop, newValue);
    }

    protected onSendRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onEditRequested(message: Message, oldMessage: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onPropChangeRequested(target: SyncedEntity, prop: string | Symbol | undefined, newValue: any){
        
    }

    protected onDeleteRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    handleFile(file: File): string | Promise<string> {
        //override to handle file attachments
        return URL.createObjectURL(file);
    }
}