import { Injector, NgZone } from "@angular/core";
import { Message } from "./Message";
import { Chat } from "./Chat";
import { MessageStatus } from "../enums/MessagesStatus";
import { SyncedEntity } from "./SyncedEntity";
import { ChatProvider } from "../interfaces/ChatProvider";
import { ChatService } from "../services/chat.service";
import { AlertService } from '../services/alert.service';
import { ClientNegotiator } from './ClientNegotiator';
import { LanguageService } from '../services/language.service';
import { OperationsNegotiationMediator } from "./OperationsNegotiationMediator";
import { OperationsNegotiationAnswer, OperationsNegotiator } from "../interfaces/OperationsNegotiator";
import { AcceptedEditCandidate, DeleteProposal, EditProposal } from "./Proposals";
export class ChatManager {
    protected chat!: Chat;
    protected chatProvider: ChatProvider;
    protected chatService: ChatService;
    private readonly alertService: AlertService;
    private readonly languageService: LanguageService;
    private negotiator: OperationsNegotiator = {
        negotiateBatchEdit: (proposal) => this.isAllowedToEditMessages(proposal),
        negotiateBatchDelete: (proposal) => this.isAllowedToDeleteMessages(proposal),
    };

    constructor(injector: Injector, chatProvider: ChatProvider) {
        this.chatProvider = chatProvider;
        this.chatService = injector.get(ChatService);
        this.alertService = injector.get(AlertService);
        this.languageService = injector.get(LanguageService);
    }

    init(chat: Chat): void | Promise<void>{
        this.chat = chat;
    }

    //@internal don't use
    createClientNegotiator(): ClientNegotiator {
        return new ClientNegotiator(this.alertService, this.languageService);
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

    isAllowedToSendMessages(message: Message): boolean | Promise<boolean> {
        return true;
    }

    requestMessageSend(message: Message) {
        return this.request(
            (message)=>this.isAllowedToSendMessages(message),
            (message)=>this.onMessageSendRequested(message),
            message
        );
    }

    isAllowedToEditMessages(proposal: EditProposal): OperationsNegotiationAnswer | Promise<OperationsNegotiationAnswer> {
        return true; 
    }

    isAllowedToDeleteMessages(proposal: DeleteProposal): OperationsNegotiationAnswer | Promise<OperationsNegotiationAnswer> {
        return true;
    }

    async requestMessagesDelete(proposal: DeleteProposal, negotiator: OperationsNegotiator): Promise<MessageStatus> {
        const negotiationResult = await new OperationsNegotiationMediator(this.chat.user.negotiator)
        .negotiate(
            proposal,
            negotiator,
            this.negotiator
        );
        if(!negotiationResult) return MessageStatus.Failed;

        const messages = [...negotiationResult.contents];
        messages.forEach((message, i) => message.status.set(MessageStatus.Pending, true));
        const status = await this.onMessagesDeleteRequested(messages);
        messages.forEach((message, i) => message.status.set(status ?? MessageStatus.Failed));
        
        const deleted = messages.filter((message) => message.status() === status);
        const deletedSet = new Set(deleted);
        this.chat.messages.update((current) => current.filter((message) => !deletedSet.has(message)));
        if(status !== MessageStatus.Failed )
            this.chat.onMessagesDeleted.next(messages);
        return status;
    }

    async requestMessagesEdit(proposal: EditProposal, negotiator: OperationsNegotiator) {
        const negotiationResult = await new OperationsNegotiationMediator(this.chat.user.negotiator)
        .negotiate<EditProposal>(
            proposal,
            negotiator,
            this.negotiator
        )
        if(!negotiationResult) return MessageStatus.Failed;
        const acceptedCandidates = [...negotiationResult.contents];
        acceptedCandidates.forEach(({newMessage, oldMessage}) => {
            oldMessage.status.set(MessageStatus.Pending, true);
            oldMessage.value.set(newMessage.value(), true);
            oldMessage.editedAt.set(newMessage.editedAt(), true);
        })
        const status = await this.onMessagesEditRequested(acceptedCandidates);
        acceptedCandidates.forEach(({newMessage, oldMessage})=>{
            oldMessage.status.set(status)
            if(status == MessageStatus.Failed) return;
            oldMessage.value.set(newMessage.value());
            oldMessage.editedAt.set(newMessage.editedAt());
        });
        const messages = acceptedCandidates.map(({oldMessage})=>oldMessage)
        if(status !== MessageStatus.Failed )
            this.chat.onMessagesEdited.next(messages)
        return status;
    }

    protected onMessagesDeleteRequested(messages: Message[]): MessageStatus | Promise<MessageStatus> {
        return MessageStatus.Read;
    }

    protected onMessagesEditRequested(messages: AcceptedEditCandidate[]): MessageStatus | Promise<MessageStatus> {
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

    protected onMessagePropChangeRequested(target: SyncedEntity, prop: string | Symbol | undefined, newValue: any){
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
