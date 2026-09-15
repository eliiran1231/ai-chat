import { Injector } from "@angular/core";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";
import { Subscription } from "rxjs";
import { AgentsService } from "../services/agents.service";
import { MessageStatus } from "../enums/MessagesStatus";

export class Agent {
    chat!: Chat;
    supporter!: Supporter;
    lastQuestion?: Question;
    lastMessage?: Message;
    private onMessageDeletedHandler?: Subscription;
    private onMessageEditedHandler?: Subscription;
    private onBatchDeletedHandler?: Subscription;
    private onBatchEditedHandler?: Subscription;
    private onAnswerSelectedHandler?: Subscription;
    private _name?: string;
    private agentService: AgentsService;
    set name(name: string){
        if(this._name) throw new Error("this agent name was already set and cannot be changed");
        this._name = name;
    }
    get name(): string {
        if(!this._name) this._name = this.agentService.getAgentName(this);
        return this._name;
    }
    
    constructor(injector: Injector) {
        this.agentService = injector.get(AgentsService);
    }

    private findLastSupporterQuestion(messages: Message[]): Question | undefined {
        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            if (message instanceof Question && message.from() === 'supporter') {
                return message;
            }
        }
        return undefined;
    }

    init(chat: Chat, supporter: Supporter, _isNewChat = false): void | Promise<void> {
        this.chat = chat;
        this.supporter = supporter;
        this.lastQuestion = this.findLastSupporterQuestion(chat.messages());
        this.onAnswerSelectedHandler = chat.user.onAnswerSelected.subscribe(({answer, associatedQuestion, associatedQuestionIndex }) => this.onAnswerSelected(answer, associatedQuestion, associatedQuestionIndex as number));
        this.onBatchDeletedHandler = chat.onMessagesDeleted.subscribe(this.onMessagesDeleted.bind(this));
        this.onBatchEditedHandler = chat.onMessagesEdited.subscribe(this.onMessagesEdited.bind(this));
    }

    respond() : void | Promise<void> {
        this.lastMessage = this.chat.messages().at(-1);
        if (!this.lastMessage) {
            throw new Error("respond was called but there is nothing to respond to");
        }
        else if (this.lastMessage.from() == "supporter") {
            throw new Error("respond was called but there is nothing to respond to. the last message is from the agent");
        }
        this.lastMessage.status.set(MessageStatus.Read);
        if (this.lastQuestion && this.lastMessage instanceof Answer && !this.lastQuestion?.isAnswerValid(this.lastMessage)) {
            this.onInvalidAnswer(this.lastMessage, this.lastQuestion);
        }
    }

    onInvalidAnswer(answer: Answer, lastQuestion: Question) {
        this.supporter.sendMessage(lastQuestion.validationErrorMessage);
        throw new Error("validation didnt pass");
    }

    private joinedAnswer(answer: Answer | readonly Answer[]): Answer {
        if (answer instanceof Answer) {
            return answer.clone();
        }
        return new Answer(answer.map(a => a.value()).join(', '));
    }

    onAnswerSelected(answer: Answer | Answer[], associatedQuestion: Question, associatedQuestionIndex: number) {
        const joinedAnswer = this.joinedAnswer(answer);

        if (associatedQuestionIndex >= this.chat.messages().length - 1) {
            this.chat.user.answer(joinedAnswer);
            return;
        }

        let responseToEdit: Message | undefined;
        for (let i = associatedQuestionIndex + 1; i < this.chat.messages().length; i++) {
            const candidate = this.chat.messages()[i];
            if (candidate instanceof Answer && candidate.from() === "client") {
                responseToEdit = candidate;
                break;
            }
        }
        responseToEdit?.edit(joinedAnswer.value()); 
    }

    /** Called once after a batch completes, with only successfully deleted messages. */
    onMessagesDeleted(messages:  Message | readonly Message[]): void | Promise<void> {
        this.lastQuestion = this.findLastSupporterQuestion(this.chat.messages());
        this.lastMessage = this.chat.messages().at(-1);
    }

    onMessagesEdited(messages: Message | readonly Message[]): void | Promise<void> {
        // Override to handle the completed batch of edits.
    }

    onDestroy(): void | Promise<void> {
        this.onMessageDeletedHandler?.unsubscribe();
        this.onMessageEditedHandler?.unsubscribe();
        this.onBatchDeletedHandler?.unsubscribe();
        this.onBatchEditedHandler?.unsubscribe();
        this.onAnswerSelectedHandler?.unsubscribe();
    }
}
