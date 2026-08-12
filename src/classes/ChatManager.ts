import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { MessageStatus } from "../enums/MessagesStatus";
import { SyncedEntity } from "./SyncedEntity";
import { ChatProvider } from "../interfaces/ChatProvider";
import { ChatService } from "../services/chat.service";

export class ChatManager {
    protected chat!: Chat;
    protected chatProvider: ChatProvider;
    protected chatService: ChatService;

    constructor(injector: Injector, chatProvider: ChatProvider) {
        this.chatProvider = chatProvider;
        this.chatService = injector.get(ChatService);
    }

    init(chat: Chat): void | Promise<void>{
        this.chat = chat;
    }

    private async request(func: () => MessageStatus | Promise<MessageStatus>, message: Message){   
        message.status.set(MessageStatus.Pending, true);
        let status = await func();
        message.status.set(status);
        return status;
    }

    requestMessageSend(message: Message) {
        return this.request(()=>this.onMessageSendRequested(message), message);
    }

    requestMessageEdit(message: Message, newValue: string) {
        let oldMessage = message.clone();
        message.value.set(newValue, true);
        message.editedAt.set(new Date(), true);
        return this.request(()=>this.onMessageEditRequested(message, oldMessage), message);
    }

    requestMessageDelete(message: Message) {
        return this.request(()=>this.onMessageDeleteRequested(message), message);
    }

    async requestDelete(): Promise<void> {
        const isDeleted = await this.onDeleteRequested()
        isDeleted && this.chatService.removeChat(this.chat.id());
    }

    requestPropChange(target: SyncedEntity, prop: string | Symbol | undefined, newValue: any){
        return this.onMessagePropChangeRequested(target, prop, newValue);
    }

    protected onMessageSendRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onMessageEditRequested(message: Message, oldMessage: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onMessagePropChangeRequested(target: SyncedEntity, prop: string | Symbol | undefined, newValue: any){
        return MessageStatus.Read;
    }

    protected onMessageDeleteRequested(message: Message): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onDeleteRequested(): boolean | Promise<boolean> {
        return true;
    }

    handleFile(file: File): string | Promise<string> {
        //override to handle file attachments
        return URL.createObjectURL(file);
    }
}
