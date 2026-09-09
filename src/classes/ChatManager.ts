import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { MessageStatus } from "../enums/MessagesStatus";
import { SyncedEntity } from "./SyncedEntity";
import { ChatProvider } from "../interfaces/ChatProvider";
import { ChatService } from "../services/chat.service";
import { BatchActionStatus } from "../enums/BatchActionStatus";
import { BatchNegotiationMediator } from "./BatchNegotiationMediator";
import { BatchNegotiationAnswer, BatchNegotiator } from "../interfaces/BatchNegotiator";
import { MessageCollection } from "./MessageCollection";
import { ReadonlySignals } from "../app/types/ReadonlySignals";
export class ChatManager {
    protected chat!: Chat;
    protected chatProvider: ChatProvider;
    protected chatService: ChatService;
    private negotiator: BatchNegotiator = {
        negotiateBatchEdit: (proposal) => this.isAllowedToBatchEdit(proposal),
        negotiateBatchDelete: (proposal) => this.isAllowedToBatchDelete(proposal),
    };

    constructor(injector: Injector, chatProvider: ChatProvider) {
        this.chatProvider = chatProvider;
        this.chatService = injector.get(ChatService);
    }

    init(chat: Chat): void | Promise<void>{
        this.chat = chat;
    }

    private async request(
        isAllowedAction: (message: Message) => boolean | Promise<boolean>,
        action: (message: Message) => MessageStatus | Promise<MessageStatus>,
        message: Message
    ){   
        message.status.set(MessageStatus.Pending, true);
        const isAllowed = await isAllowedAction(message);
        if(!isAllowed) {
            message.status.set(MessageStatus.Failed);
            return MessageStatus.Failed;
        }
        const status = await action(message);
        message.status.set(status);
        return status;
    }

    isAllowedToSend(message: Message): boolean | Promise<boolean> {
        return true;
    }

    requestMessageSend(message: Message) {
        return this.request(
            (message)=>this.isAllowedToSend(message),
            (message)=>this.onMessageSendRequested(message),
            message
        );
    }

    isAllowedToBatchEdit(proposal: Set<ReadonlySignals<Message>>): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer> {
        return { type: BatchActionStatus.Approved }; 
    }

    isAllowedToEdit(message: Message): boolean | Promise<boolean> {
        return true;
    }

    requestMessageEdit(message: Message, newValue: string) {
        let oldMessage = message.clone();
        message.value.set(newValue, true);
        message.editedAt.set(new Date(), true);
        return this.request(
            this.isAllowedToEdit.bind(this),
            (message)=>this.onMessageEditRequested(message, oldMessage),
            message
        );
    }

    isAllowedToBatchDelete(proposal: Set<ReadonlySignals<Message>>): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer> {
        return { type: BatchActionStatus.Approved }; 
    }

    isAllowedToDelete(message: Message): boolean | Promise<boolean> {
        return true;
    }

    requestMessageDelete(message: Message) {
        return this.request(
            this.isAllowedToDelete.bind(this),
            this.onMessageDeleteRequested.bind(this),
            message
        );
    }

    async requestBatchDelete(messageCollection: MessageCollection): Promise<Message[]> {
        const messages = await this.requestAllowedBatch(
            'delete',
            messageCollection.negotiationMediator,
            messageCollection.negotiator,
            (batch) => this.onBatchDeleteRequested(batch),
        );
        const deleted = messages.filter((message) =>
            message.status() === MessageStatus.Sent || message.status() === MessageStatus.Read);
        const deletedSet = new Set(deleted);
        this.chat.messages.update((current) => current.filter((message) => !deletedSet.has(message)));
        if (deleted.length) this.chat.onBatchDeleted.next(deleted);
        return messages;
    }

    async requestBatchEdit(messageCollection: MessageCollection, newValues: string[]) {
        const updateUi = (messages: Message[])=>{
            messages.forEach((message, i) => {
                const newValue = newValues[i];
                if(newValue === undefined) return;
                message.value.set(newValue, true);
                message.editedAt.set(new Date(), true);
            })
        }    
        return this.requestAllowedBatch(
            'edit',
            messageCollection.negotiationMediator,
            messageCollection.negotiator,
            (messages)=>{
                updateUi(messages)
                return this.onBatchEditRequested(messages)
            }
        );
    }

    private async requestAllowedBatch(
        actionType: 'edit' | 'delete',
        mediator: BatchNegotiationMediator,
        requesterNegotiator: BatchNegotiator,
        action: (messages: Message[]) => MessageStatus[] | Promise<MessageStatus[]>,
    ){
        const negotiationResult = await mediator.mediateBatchActionNegotiation(
            actionType,
            this.negotiator,
            requesterNegotiator
        );
        if(!negotiationResult) return [];
        const messages = [...negotiationResult];
        messages.forEach((message, i) => message.status.set(MessageStatus.Pending));
        const statuses = await action(messages);
        messages.forEach((message, i) => message.status.set(statuses[i] ?? MessageStatus.Failed));
        return messages;
    }

    protected onBatchDeleteRequested(messages: Message[]): MessageStatus[] | Promise<MessageStatus[]> {
        return messages.map(message=>MessageStatus.Read);
    }

    protected onBatchEditRequested(messages: Message[]): MessageStatus[] | Promise<MessageStatus[]> {
        return messages.map(message=>MessageStatus.Read);
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
