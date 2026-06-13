import { Injector } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { ChatManagersService } from "../services/chat-managers.service";

export class ChatManager {
    protected chat!: Chat;
    private _name?: string;
    private chatManagersService: ChatManagersService;

    constructor(protected injector: Injector) {
        this.chatManagersService = injector.get(ChatManagersService);
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