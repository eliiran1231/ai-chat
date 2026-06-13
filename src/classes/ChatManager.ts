import { Injector } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";

export class ChatManager {
    protected chat!: Chat;
    constructor(protected injector: Injector) {
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
}