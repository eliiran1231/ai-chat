import { Chat } from "./Chat";
import { Uuid } from "../interfaces/db/Uuid";
import { SyncedEntity } from "./SyncedEntity";
import { MessageStatus } from "../enums/MessagesStatus";
import { isSignal, signal, Signal } from '@angular/core';
import { syncedSignal, SyncedSignal } from '../signals/syncedSignal';

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
    status?: MessageStatus,
    editedAt?: Date
}

export class Message extends SyncedEntity {
    id: Signal<Uuid>;
    from: SyncedSignal<MessageSender | undefined>;
    time: SyncedSignal<Date>;
    editedAt: SyncedSignal<Date | undefined>;
    tag: SyncedSignal<string>;
    value: SyncedSignal<string>;
    status: SyncedSignal<MessageStatus>;
    attachment: SyncedSignal<Attachment | undefined>;
    editable: SyncedSignal<boolean>;
    deletable: SyncedSignal<boolean>;
    private _chat!: Chat;
    private lastAction = () => this._chat['manager']?.requestSend(this);

    setChat(chat: Chat) {
        this._chat = chat;
    }

    constructor(value: string, options?: MessageOptions) {
        super();
        this.id = signal(options?.id ?? '');
        this.from = syncedSignal<MessageSender | undefined>(options?.from);
        this.time = syncedSignal(options?.time ?? new Date());
        this.editedAt = syncedSignal<Date | undefined>(options?.editedAt);
        this.tag = syncedSignal(options?.tag ?? 'general');
        this.value = syncedSignal(value);
        this.status = syncedSignal(options?.status ?? MessageStatus.Pending);
        this.attachment = syncedSignal<Attachment | undefined>(options?.attachment);
        this.editable = syncedSignal(options?.editable ?? true);
        this.deletable = syncedSignal(options?.deletable ?? true);
    }

    async edit(newValue: string): Promise<boolean> {
        this.lastAction = () => this._chat['manager'].requestEdit(this, newValue);
        if (
            !this.editable() ||
            this.from() === 'supporter' ||
            !this._chat ||
            this.value() === newValue ||
            await this._chat['manager'].requestEdit(this, newValue) == MessageStatus.Failed
        ) return false;            
        this.value.set(newValue);
        this.editedAt.set(new Date());
        this._chat.onMessageEdited.next(this);
        return true;
    }

    setAttachment(attachment?: Attachment): void {
        this.attachment.set(attachment);
    }

    async delete(): Promise<boolean> {
        this.lastAction = () => this._chat['manager'].requestDelete(this);
        if (
            !this.deletable() ||
            !this._chat ||
            await this._chat['manager'].requestDelete(this) === MessageStatus.Failed
        ) return false;
        this._chat.onMessageDeleted.next(this);
        this._chat.messages.update(msgs => msgs.filter(msg => msg !== this));
        return true;
    }

    retry(){
        return this.lastAction();
    }

    clone(): Message {
        const options: any = { ...this };
        delete options._chat;
        delete options.lastAction;
        for (const key of Object.keys(options)) {
            if (isSignal(options[key])) {
                options[key] = options[key]();
            }
        }
        return new (this.constructor as typeof Message)(this.value(), options);
    }
}
