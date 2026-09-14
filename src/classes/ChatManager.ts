import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { MessageStatus } from "../enums/MessagesStatus";
import { SyncedEntity } from "./SyncedEntity";
import { ChatProvider } from "../interfaces/ChatProvider";
import { ChatService } from "../services/chat.service";
import { BatchNegotiationMediator } from "./BatchNegotiationMediator";
import { BatchNegotiationAnswer, BatchNegotiator } from "../interfaces/BatchNegotiator";
import { AcceptedEditCandidate, AcceptedProposal, DeleteProposal, EditProposal, Proposal } from "./Proposals";
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

    isAllowedToBatchEdit(proposal: EditProposal): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer> {
        return true; 
    }

    isAllowedToBatchDelete(proposal: DeleteProposal): BatchNegotiationAnswer | Promise<BatchNegotiationAnswer> {
        return true;
    }

    async requestBatchDelete(proposal: DeleteProposal, negotiator: BatchNegotiator): Promise<MessageStatus> {
        const negotiationResult = await new BatchNegotiationMediator(this.chat.user.negotiator)
        .negotiate(
            proposal,
            negotiator,
            this.negotiator
        );
        if(!negotiationResult) return MessageStatus.Failed;

        const messages = [...negotiationResult.contents];
        messages.forEach((message, i) => message.status.set(MessageStatus.Pending));
        const status = await this.onBatchDeleteRequested(messages);
        messages.forEach((message, i) => message.status.set(status ?? MessageStatus.Failed));
        
        const deleted = messages.filter((message) => message.status() === status);
        const deletedSet = new Set(deleted);
        this.chat.messages.update((current) => current.filter((message) => !deletedSet.has(message)));
        if (deleted.length) this.chat.onBatchDeleted.next(deleted);
        return status;
    }

    async requestBatchEdit(proposal: EditProposal, negotiator: BatchNegotiator) {
        const negotiationResult = await new BatchNegotiationMediator(this.chat.user.negotiator)
        .negotiate<EditProposal>(
            proposal,
            negotiator,
            this.negotiator
        )
        if(!negotiationResult) return MessageStatus.Failed;
        const messages = [...negotiationResult.contents];
        messages.forEach(({newMessage}) => newMessage.status.set(MessageStatus.Pending))
        const status = await this.onBatchEditRequested(messages);
        messages.forEach(({newMessage})=>newMessage.status.set(status));
        return status;
    }

    protected onBatchDeleteRequested(messages: Message[]): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onBatchEditRequested(messages: AcceptedEditCandidate[]): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
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
