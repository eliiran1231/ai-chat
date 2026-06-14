import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { ChatManagersService } from "../services/chat-managers.service";
import { MessageStatus } from "../enums/MessagesStatus";

export class ChatManager {
    protected chat!: Chat;
    private _name?: string;
    private chatManagersService: ChatManagersService;
    ngZone: NgZone;

    constructor(protected injector: Injector) {
        this.chatManagersService = injector.get(ChatManagersService);
        this.ngZone = injector.get(NgZone);
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

    private async request(func: () => boolean | Promise<boolean>, message: Message){
        message.status = MessageStatus.Pending
        let isSuccessful = await func();
        return this.ngZone.run(async()=>{    
            if(!isSuccessful) message.status = MessageStatus.Failed;
            return isSuccessful;
        })
    }

    requestSend(message: Message) {
        return this.request(()=>this.onSendRequested(message), message);
    }

    requestEdit(message: Message, newValue: string) {
        return this.request(()=>this.onEditRequested(message, newValue), message);
    }

    requestDelete(message: Message) {
        return this.request(()=>this.onDeleteRequested(message), message);
    }

    onSendRequested(message: Message): boolean | Promise<boolean> {
        return true;
    }

    onEditRequested(message: Message, newValue: string): boolean | Promise<boolean> {
        return true;
    }

    onDeleteRequested(message: Message): boolean | Promise<boolean> {
        return true;
    }

    onDestroy(): void | Promise<void> {
        
    }
}