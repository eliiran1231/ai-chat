import { Chat } from "./Chat";
import { Uuid } from "../interfaces/db/Uuid";
import { DBEntity, dbProperty } from "./DBEntity";

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
    id?: Uuid,
    tag?: string,
    attachment?: Attachment,
    editable?: boolean,
    deletable?: boolean,
    time?: Date,
    from?: MessageSender,
    isRead?: boolean,
    editedAt?: Date
}

export class Message extends DBEntity {
    id!: Uuid;
    @dbProperty
    from?: MessageSender;
    @dbProperty
    time: Date;
    @dbProperty
    editedAt?: Date;
    @dbProperty
    tag: string;
    @dbProperty
    value: string;
    @dbProperty
    isRead: boolean;
    @dbProperty
    attachment?: Attachment;
    @dbProperty
    editable: boolean;
    @dbProperty
    deletable: boolean;
    private _chat?: Chat;

    setChat(chat: Chat) {
        this._chat = chat;
    }

    constructor(value: string, options?: MessageOptions) {
        super();
        this.value = value;
        this.attachment = options?.attachment;
        if (options?.id) this.id = options.id;
        this.editable = options?.editable ?? true;
        this.deletable = options?.deletable ?? true;
        this.tag = options?.tag ?? 'general';
        this.from = options?.from;
        this.time = options?.time ?? new Date();
        this.editedAt = options?.editedAt;
        this.isRead = options?.isRead ?? false;
        if (new.target === Message) this.enableDbChanges();
    }

    async edit(newValue: string): Promise<boolean> {
        if (
            !this.editable ||
            this.from === 'supporter' ||
            !this._chat ||
            this.value === newValue ||
            await this._chat.manager?.onEditRequested(this, newValue) === false
        ) return false;
        this.value = newValue;
        this.editedAt = new Date();
        this._chat.onMessageEdited.next(this);
        return true;
    }

    setAttachment(attachment?: Attachment): void {
        this.attachment = attachment;
    }

    async delete(): Promise<boolean> {
        if (
            !this.deletable ||
            !this._chat ||
            await this._chat.manager?.onDeleteRequested(this) === false
        ) return false;
        this._chat.onMessageDeleted.next(this);
        const index = this._chat.messages.indexOf(this, this._chat.messages.length - 1);
        index >= 0 && this._chat.messages.splice(index, 1);
        return true;
    }
}
