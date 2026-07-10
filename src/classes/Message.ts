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
    readonly id: Signal<Uuid>;
    readonly from: SyncedSignal<MessageSender | undefined>;
    readonly time: SyncedSignal<Date>;
    readonly editedAt: SyncedSignal<Date | undefined>;
    readonly tag: SyncedSignal<string>;
    readonly value: SyncedSignal<string>;
    readonly status: SyncedSignal<MessageStatus>;
    readonly attachment: SyncedSignal<Attachment | undefined>;
    readonly editable: SyncedSignal<boolean>;
    readonly deletable: SyncedSignal<boolean>;
    private _chat!: Chat;
    private lastAction = () => this._chat['manager']?.requestMessageSend(this);

    setChat(chat: Chat) {
        this._chat = chat;
    }

    constructor(value: string, options?: MessageOptions) {
        super();
        this.id = signal(options?.id ?? crypto.randomUUID());
        this.from = syncedSignal<MessageSender | undefined>(options?.from);
        this.time = syncedSignal(options?.time ?? new Date());
        this.editedAt = syncedSignal<Date | undefined>(options?.editedAt);
        this.tag = syncedSignal(options?.tag ?? 'general');
        this.value = syncedSignal(value);
        this.status = syncedSignal(options?.status ?? MessageStatus.Failed);
        this.attachment = syncedSignal<Attachment | undefined>(options?.attachment);
        this.editable = syncedSignal(options?.editable ?? true);
        this.deletable = syncedSignal(options?.deletable ?? true);
        this.initSync()
    }

    async edit(newValue: string): Promise<boolean> {
        this.lastAction = () => this._chat['manager'].requestMessageEdit(this, newValue);
        if (
            !this.editable() ||
            this.from() === 'supporter' ||
            !this._chat ||
            this.value() === newValue ||
            await this._chat['manager'].requestMessageEdit(this, newValue) == MessageStatus.Failed
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
        this.lastAction = () => this._chat['manager'].requestMessageDelete(this);
        if (
            !this.deletable() ||
            !this._chat ||
            await this._chat['manager'].requestMessageDelete(this) === MessageStatus.Failed
        ) return false;
        this._chat.onMessageDeleted.next(this);
        this._chat.messages.update(msgs => msgs.filter(msg => msg !== this));
        return true;
    }

    async retry(){
        if (this.status() !== MessageStatus.Failed) return;
        if (this.from() === 'supporter') {
            const deleted = await this.delete();
            return deleted ? this._chat.supporter.respond() : Promise.resolve();
        }
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
