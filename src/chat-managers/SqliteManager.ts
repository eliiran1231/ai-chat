import { Injector } from "@angular/core";
import { ChatManager } from "../classes/ChatManager";
import { Message } from "../classes/Message";
import { getPersistableValidationErrorMessage, Question } from "../classes/Question";
import { MessageStatus } from "../enums/MessagesStatus";
import { DbService } from "../services/db.service";
import { Answer } from "../classes/Answer";
import { Chat } from "../classes/Chat";
import { Supporter } from "../classes/Supporter";

export class SqliteManager extends ChatManager {
    dbService: DbService
    pendingMessagePersists = new WeakMap<Message, Promise<void>>();

    constructor(injector: Injector) {
        super(injector);
        this.dbService = injector.get(DbService);
    }

    override init(chat: Chat): void | Promise<void> {
        super.init(chat);
    }

    private async persistMessage (message: Message) {
        const messageType = message instanceof Answer ? "answer" : message instanceof Question ? "question" : "message";
        const record = await this.dbService.createMessage({
            id: message.id,
            chatId: this.chat.id,
            from: message.from,
            messageType,
            value: message.value,
            tag: message.tag,
            time: message.time.toISOString(),
            editedAt: message.editedAt?.toISOString(),
            status: message.status,
            editable: message.editable,
            deletable: message.deletable,
            attachment: message.attachment,
            possibleAnswers: message instanceof Question
                ? message.possibleAnswers.map((possibleAnswer) =>
                    typeof possibleAnswer === 'string'
                        ? possibleAnswer
                        : possibleAnswer.value
                )
                : undefined,
            validatorSpec: message instanceof Question ? message.validatorSpec : undefined,
            validationErrorMessage: message instanceof Question
                ? getPersistableValidationErrorMessage(message.validationErrorMessage)
                : undefined,
        });
        message.id = record.id;
        message.status = record.status;
        message.editable = record.editable;
        message.deletable = record.deletable;
        message.setSaveChangesHandler((target) => void this.commitMessageChanges(target));
    };

    async commitMessageChanges(message: Message): Promise<boolean> {
        const messageType = message instanceof Answer ? 'answer' : message instanceof Question ? 'question' : 'message';
        return this.dbService.commitMessage({
            id: message.id,
            from: message.from,
            messageType,
            value: message.value,
            tag: message.tag,
            time: message.time.toISOString(),
            editedAt: message.editedAt?.toISOString(),
            status: message.status,
            editable: message.editable,
            deletable: message.deletable,
            attachment: message.attachment,
            possibleAnswers: message instanceof Question
                ? message.possibleAnswers.map((answer) => answer.value)
                : undefined,
            validatorSpec: message instanceof Question ? message.validatorSpec : undefined,
            validationErrorMessage: message instanceof Question
                ? getPersistableValidationErrorMessage(message.validationErrorMessage)
                : undefined,
        });
    }

    commitChatChanges(chat: Chat): Promise<boolean> {
        return this.dbService.commitChat({
            id: chat.id,
            name: chat.name,
            status: chat.status,
            avatar: chat.avatar,
            subtitle: chat.subtitle,
            timeLabel: chat.timeLabel,
            unreadCount: chat.unreadCount,
            highlightTime: chat.highlightTime,
            avatarRing: chat.avatarRing,
            tipLabel: chat.tipLabel,
        });
    }

    async commitSupporterChanges(supporter: Supporter): Promise<void> {
        await this.dbService.commitSupporter({
            id: supporter.id,
            name: supporter.name,
            expects: supporter.expects,
            context: supporter.context,
        });
    }

    override async onSendRequested(message: Message): Promise<MessageStatus> {
        super.onSendRequested(message)
        try {
            const persisted = this.persistMessage(message);
            this.pendingMessagePersists.set(message, persisted);
            void persisted.finally(() => this.pendingMessagePersists.delete(message));
            await persisted;
            return MessageStatus.Read;
        }
        catch (error) {
            console.error(error)
            return MessageStatus.Failed;
        }
    }

    override async onEditRequested(message: Message, oldMessage: Message): Promise<MessageStatus> {
        super.onEditRequested(message, oldMessage);
        try {
            let isSuccessful = await this.commitMessageChanges(message);
            return isSuccessful ? MessageStatus.Read : MessageStatus.Failed;
        }
        catch (error) {
            console.error(error)
            return MessageStatus.Failed;
        }
    }

    override async onDeleteRequested(message: Message): Promise<MessageStatus> {
        super.onDeleteRequested(message);
        try {
            await this.pendingMessagePersists.get(message);
            let isSuccessful = await this.dbService.deleteMessage(message.id);
            return isSuccessful ? MessageStatus.Read : MessageStatus.Failed;
        }
        catch (error) {
            console.error(error)
            return MessageStatus.Failed;
        }
    }
}