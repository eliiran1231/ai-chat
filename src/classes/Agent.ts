import { Injector } from "@angular/core";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Supporter } from "./Supporter";
import { Subscription } from "rxjs";
import { AgentsService } from "../services/agents.service";

export class Agent {
    chat: Chat = null as any;
    supporter: Supporter = new Supporter();
    lastQuestion?: Question;
    lastMessage?: Message;
    private onMessageDeletedHandler?: Subscription;
    private onMessageEditedHandler?: Subscription;
    private onAnswerSelectedHandler?: Subscription;
    private _name?: string;
    private agentService: AgentsService;
    set name(name: string){
        if(this._name) throw new Error("this agent name was already set and cannot be changed")
    }
    get name(): string {
        if(!this._name) this._name = this.agentService.getAgentName(this);
        return this._name;
    }
    
    constructor(injector: Injector) {
        this.agentService = injector.get(AgentsService);
    }

    private findLastSupporterQuestion(messages: Message[]): Question | undefined {
        for (let i = this.chat.messages.length - 1; i >= 0; i--) {
            const message = this.chat.messages[i];
            if (message instanceof Question && message.from === 'supporter') {
                return message;
            }
        }
        return undefined;
    }

    init(chat: Chat, supporter: Supporter): void | Promise<void> {
        this.chat = chat;
        this.supporter = supporter;
        this.lastQuestion = this.findLastSupporterQuestion(chat.messages);
        this.onAnswerSelectedHandler = chat.user.onAnswerSelected.subscribe(({answer, associatedQuestion, associatedQuestionIndex }) => this.onAnswerSelected(answer, associatedQuestion, associatedQuestionIndex as number));
        this.onMessageDeletedHandler = chat.onMessageDeleted.subscribe(this.onMessageDeleted.bind(this));
        this.onMessageEditedHandler = chat.onMessageEdited.subscribe(this.onMessageEdited.bind(this));
        chat.setFileUrlProcessor(this.handleFile.bind(this));
    }

    respond(edited = false) : void | Promise<void> {
        this.lastMessage = this.chat.messages.at(-1);
        if (!this.lastMessage) {
            throw new Error("respond was called but there is nothing to respond to");
        }
        else if (this.lastMessage.from == "supporter") {
            throw new Error("respond was called but there is nothing to respond to. the last message is from the agent");
        }
        if (this.lastQuestion && this.lastMessage instanceof Answer && !this.lastQuestion?.isAnswerValid(this.lastMessage)) {
            this.onInvalidAnswer(this.lastMessage, this.lastQuestion);
        }
    }

    onInvalidAnswer(answer: Answer, lastQuestion: Question) {
        this.supporter.sendMessage(lastQuestion.validationErrorMessage);
        throw new Error("validation didnt pass");
    }

    private joinedAnswer(answer: Answer | Answer[]): Answer {
        if (!Array.isArray(answer)) {
            return answer.clone();
        }
        return new Answer(answer.map(a => a.value).join(', '));
    }

    onAnswerSelected(answer: Answer | Answer[], associatedQuestion: Question, associatedQuestionIndex: number) {
        const joinedAnswer = this.joinedAnswer(answer);

        if (associatedQuestionIndex >= this.chat.messages.length - 1) {
            this.chat.user.answer(joinedAnswer);
            return;
        }

        let responseToEdit: Message | undefined;
        for (let i = associatedQuestionIndex + 1; i < this.chat.messages.length; i++) {
            const candidate = this.chat.messages[i];
            if (candidate instanceof Answer && candidate.from === "client") {
                responseToEdit = candidate;
                break;
            }
        }

        if (responseToEdit) {
            responseToEdit.edit(joinedAnswer.value);
        }
    }

    onMessageEdited(message: Message) {
        for (let i = this.chat.messages.length - 1; i >= 0; i--) {
            const msg = this.chat.messages[i];
            if (msg.id === message.id) break;
            msg.delete();
        }
        this.lastQuestion = this.findLastSupporterQuestion(this.chat.messages);
        this.respond(true);
    }

    onMessageDeleted(message: Message) {
        //override to handle message deletions
    }

    handleFile(file: File): string | Promise<string> {
        //override to handle file attachments
        return URL.createObjectURL(file);
    }

    onDestroy(): void | Promise<void> {
        this.onMessageDeletedHandler?.unsubscribe();
        this.onMessageEditedHandler?.unsubscribe();
        this.onAnswerSelectedHandler?.unsubscribe();
    }
}
