import { FlowAgent } from "../agents/FlowAgent/FlowAgent";
import { Chat } from "../classes/Chat";
import { SqliteManager } from "./SqliteManager";
import { Answer } from "../classes/Answer";
import { Message } from "../classes/Message";
import { MessageStatus } from "../enums/MessagesStatus";
import { flowQuestionTags } from "../agents/FlowAgent/mockFlow.machine";

export class XStateManager extends SqliteManager {
    currentAgent?: FlowAgent;

    override init(chat: Chat): void | Promise<void> {
        super.init(chat);
        chat.supporter.onAgentSwitch.subscribe((agent)=>{
            this.currentAgent = agent instanceof FlowAgent ? agent : undefined;
        });
        // Fired only after persistence succeeds and the deleted messages leave the chat.
        chat.onMessagesDeleted.subscribe(messages => {
            const actor = this.currentAgent?.actor;
            if (!actor) return;
            const context = actor.getSnapshot().context;
            actor.send({
                type: "DELETE",
                tags: messages.map(message => {
                    // Answers saved before tag inheritance still have their IDs in context.
                    if ([context.name.messageId, context.name.questionId].includes(message.id())) return flowQuestionTags.name;
                    if ([context.age.messageId, context.age.questionId].includes(message.id())) return flowQuestionTags.age;
                    return message.tag();
                }),
            });
        });
    }

    override onMessageSendRequested(message: Message): Promise<MessageStatus> {
        const questionTag = this.currentAgent?.lastQuestion?.tag();
        if (message instanceof Answer && message.from()?.type === 'client' &&
            (questionTag === flowQuestionTags.name || questionTag === flowQuestionTags.age)) {
            // Persist the checkpoint tag with the answer on its first save.
            message.tag.set(questionTag);
        }
        return super.onMessageSendRequested(message);
    }
}
