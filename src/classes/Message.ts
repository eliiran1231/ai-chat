import { Chat } from "./Chat";

export type MessageSender = 'client' | 'supporter';
export type MessageType = 'message' | 'question' | 'answer';
export type Attachment = { 
    type: string,
    url: string,
    size: number,
    extension: string,
    name: string 
};
export type MessageOptions = {
    id?: number,
    tag?: string,
    attachment?: Attachment,
    editable?: boolean,
    deletable?: boolean,
}

export class Message {
    id: number;
    from?: MessageSender;
    time: Date = new Date();
    editedAt?: Date;
    tag: string;
    value: string;
    isRead: boolean = false;
    attachment?: Attachment;
    editable: boolean;
    deletable: boolean;
    private _chat?: Chat;

    setChat(chat: Chat) {
        this._chat = chat;
    }

    constructor(value: string, options?: MessageOptions) {
        this.value = value;
        this.attachment = options?.attachment;
        this.id = options?.id ?? 0;
        this.editable = options?.editable ?? true;
        this.deletable = options?.deletable ?? true;
        this.tag = options?.tag ?? 'general';
    }

    edit(newValue: string): void {
        if (!this.editable || this.from === 'supporter' || !this._chat) return;
        this.value = newValue;
        this.editedAt = new Date();
        this._chat.onMessageEdited.next(this);
    }

    delete(): void {
        if (!this.deletable || !this._chat) return;
        this._chat.onMessageDeleted.next(this);
        const index = this._chat.messages.indexOf(this, this._chat.messages.length - 1);
        index >= 0 && this._chat.messages.splice(index, 1);
    }
}
