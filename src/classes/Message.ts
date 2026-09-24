import { Chat } from "./Chat";
import { Uuid } from "../interfaces/db/Uuid";
import { SyncedEntity } from "./SyncedEntity";
import { MessageStatus } from "../enums/MessagesStatus";
import { isSignal, signal, Signal, type Type } from '@angular/core';
import { syncedSignal, SyncedSignal } from '../signals/syncedSignal';
import { DeleteProposal, EditProposal } from "./Proposals";
import { OperationsNegotiator } from "../interfaces/OperationsNegotiator";
import { defaultNegotiator } from "./DefaultNegotiator";
import type { Agent } from "./Agent";

export type MessageSender =
    | { type: 'client'; senderClass?: never }
    | { type: 'supporter'; senderClass?: Type<Agent> };
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

export type OperationOptions = {
    negotiator?: OperationsNegotiator
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
    private _chat?: Chat;
    private lastAction: () => Promise<any> = () => Promise.resolve(null);

    setChat(chat: Chat) {
        this._chat = chat;
        this.lastAction = ()=>chat['manager'].requestMessageSend(this);
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

    async edit(newValue: string, options?: OperationOptions): Promise<boolean> {
        if(!this._chat) return false;
        const [newMessage, oldMessage] = [this.clone(), this]
        newMessage.value.set(newValue, true)
        newMessage.editedAt.set(new Date(), true)
        const proposal = new EditProposal(new Set([{
            newMessage,
            oldMessage
        }]));
        const { negotiator } = this.parseOperationsOptions(options);       
        const chat = this._chat;
        this.lastAction = () => chat['manager'].requestMessagesEdit(proposal, negotiator!);
        if (
            !this.editable() ||
            this.from()?.type === 'supporter' ||
            this.value() === newValue ||
            await this.lastAction() == MessageStatus.Failed
        ) return false;
        return true;
    }

    setAttachment(attachment?: Attachment): void {
        this.attachment.set(attachment);
    }

    async delete(options?: OperationOptions): Promise<boolean> {
        if(!this._chat) return false; 
        const proposal = new DeleteProposal(new Set([this]));
        const { negotiator } = this.parseOperationsOptions(options);
        this.lastAction = ()=>this.delete(options);
        if (
            !this.deletable() ||
            await this._chat['manager'].requestMessagesDelete(proposal, negotiator!) === MessageStatus.Failed
        ) return false;
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

    private parseOperationsOptions(options?: OperationOptions){
        if(!options) options = {};
        options.negotiator ??= this._chat?.supporter.negotiator || defaultNegotiator;
        return options;
    }
}
