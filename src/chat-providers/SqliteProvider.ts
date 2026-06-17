import { inject, Injectable, Injector } from "@angular/core";
import { ChatProvider } from "../interfaces/ChatProvider";
import { Chat, ChatOptions } from "../classes/Chat";
import { DbService } from "../services/db.service";
import { AgentsService } from "../services/agents.service";
import { Question, QuestionOptions } from "../classes/Question";
import { Message, MessageOptions } from "../classes/Message";
import { Answer } from "../classes/Answer";
import { coerceValidatorSpec } from "../classes/MessageValidator";
import { MessageRecord } from "../interfaces/db/MessageRecord";
import { Supporter } from "../classes/Supporter";
import { SupporterRecord } from "../interfaces/db/SupporterRecord";
import { Agent } from "../classes/Agent";
import { ChatRecord } from "../interfaces/db/ChatRecord";
import { Uuid } from "../interfaces/db/Uuid";
import { SqliteManager } from "../chat-managers/SqliteManager";

@Injectable({
    providedIn: 'root'
})

export class SqliteProvider implements ChatProvider {
    private dbService = inject(DbService);
    private agentsService = inject(AgentsService);
    injector: Injector = inject(Injector);

    async getChats(): Promise<Chat[]> {
        const records = await this.dbService.getChats();
        return Promise.all(
            records.map(async (record) => {
                const [messages, persistedSupporterRecord] = await Promise.all([
                    this.dbService.getChatMessages(record.id),
                    this.dbService.getChatSupporter(record.id),
                ]);
                if (!persistedSupporterRecord?.agentName) throw new Error("couldn't retrieve agent from SQL")
                const initialAgent = this.agentsService.getAgentByName(persistedSupporterRecord.agentName);
                initialAgent.name = persistedSupporterRecord.agentName;
                const supporterRecord = persistedSupporterRecord ?? await this.dbService.createSupporter({
                    chatId: record.id,
                    agentName: initialAgent.name,
                    context: '',
                });

                return this.hydrateChat(
                    record,
                    initialAgent,
                    messages,
                    supporterRecord,
                );
            }),
        );
    }

    async createChat(
        name: string,
        initialAgent: Agent,
        options: ChatOptions = {},
    ): Promise<Chat> {
        const record = await this.dbService.createChat({
            name,
            status: options.status,
            avatar: options.avatar,
            subtitle: options.subtitle,
            timeLabel: options.timeLabel,
            unreadCount: options.unreadCount,
            highlightTime: options.highlightTime,
            avatarRing: options.avatarRing,
            tipLabel: options.tipLabel,
        });

        const supporterRecord = await this.dbService.createSupporter({
            chatId: record.id,
            agentName: initialAgent.name,
            context: '{}',
        });

        return this.hydrateChat(record, initialAgent, [], supporterRecord);
    }

    async deleteChat(chatId: Uuid): Promise<void> {
        return void this.dbService.deleteChat(chatId);
    }

    hydrateChat(
        record: ChatRecord,
        initialAgent: Agent,
        messageRecords: MessageRecord[],
        supporterRecord?: SupporterRecord | null,
    ): Chat {
        let context;
        try {
            context = supporterRecord ? JSON.parse(supporterRecord.context) : {};
        }
        catch {
            context = {};
        }
        const supporter = new Supporter(
            supporterRecord?.id,
            supporterRecord?.name,
            supporterRecord?.expects,
            context
        );
        const manager = new SqliteManager(this.injector);
        const chat = new Chat(record.id, record.name, supporter, manager, this, {
            status: record.status, 
            avatar: record.avatar,
            subtitle: record.subtitle,
            timeLabel: record.timeLabel,
            unreadCount: record.unreadCount,
            highlightTime: record.highlightTime,
            avatarRing: record.avatarRing,
            tipLabel: record.tipLabel,
        });
        chat.setSaveChangesHandler((target)=>void manager.commitChatChanges(target));
        for (const messageRecord of messageRecords) {
            const message = this.hydrateMessage(messageRecord, manager);
            message.setChat(chat);
            chat.messages.push(message);
        }
        supporter.setSaveChangesHandler(manager.commitSupporterChanges.bind(manager));
        supporter.onAgentSwitch.subscribe((agent) => this.dbService.updateSupporterAgent({
            chatId: chat.id,
            agentName: agent.name,
        }));
        supporter.setAgent(initialAgent);
        return chat;
    }

    private hydrateMessage(record: MessageRecord, manager: SqliteManager): Message {
        const messageType = record.messageType ?? 'message';
        const options: MessageOptions = {
            ...record,
            time: new Date(record.time),
            editedAt: record.editedAt ? new Date(record.editedAt) : undefined,
        };

        const message = messageType === 'question'
            ? this.hydrateQuestion(record, options)
            : messageType === 'answer'
                ? new Answer(record.value, options)
                : new Message(record.value, options);
        message.setSaveChangesHandler(target => void manager.commitMessageChanges(target));
        return message;
    }

    private hydrateQuestion(record: MessageRecord, options: MessageOptions): Question {
        const validatorSpec = coerceValidatorSpec(record.validatorSpec);
        const questionOptions: QuestionOptions = {
            ...options,
            possibleAnswers: record.possibleAnswers,
            validationErrorMessage: record.validationErrorMessage,
            validator: validatorSpec,
        };
        const question = new Question(record.value, questionOptions);

        if (!validatorSpec && record.validationErrorMessage) {
            question.validationErrorMessage = record.validationErrorMessage;
        }

        return question;
    }
}