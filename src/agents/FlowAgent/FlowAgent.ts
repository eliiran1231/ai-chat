import { Injector } from "@angular/core";
import { ActorRefFrom, createActor } from "xstate";
import { Agent } from "../../classes/Agent";
import { Answer } from "../../classes/Answer";
import { Chat } from "../../classes/Chat";
import { Question } from "../../classes/Question";
import { Supporter } from "../../classes/Supporter";
import { FlowContext, flowQuestionTags, mockFlowMachine, restoreFlowContext } from "./mockFlow.machine";


export class FlowAgent extends Agent {
    private actions!: Record<string, any>;
    public actor!: ActorRefFrom<typeof mockFlowMachine>;

    constructor(private injector: Injector) {
        super(injector);
    }

    buildActions() {
        const proto = Object.getPrototypeOf(this);
        const methodNames = Object.getOwnPropertyNames(proto)
            .filter(name =>
                typeof (this as any)[name] === 'function' &&
                name !== 'constructor' &&
                !name.startsWith('_')
            );

        const actions: Record<string, any> = {};
        for (const name of methodNames) {
            actions[name] = (args: any) => {
                return (this as any)[name](args);
            };
        }
        return actions;
    }

    override onInvalidAnswer(answer: Answer, lastQuestion: Question): void {
        //let xstate handle the invalid answer 
    }

    override init(chat: Chat, supporter: Supporter) {
        super.init(chat, supporter);
        this.actions = this.buildActions();
        const snapshot = supporter.context?.context
            ? { ...supporter.context, context: restoreFlowContext(supporter.context.context) }
            : undefined;
        this.actor = createActor(mockFlowMachine.provide({
            actions: this.actions,
            guards: this.actions,
        }), {
            snapshot,
        });
        this.actor.subscribe((state) => {
            console.log(state);
            void this.supporter.setContext(state.toJSON());
        });
        this.actor.start();
    }

    override async respond(): Promise<void> {
        super.respond();
        if (!this.lastMessage) return;

        this.actor.send({
            type: this.lastMessage instanceof Question ? "QUESTION" : "ANSWER",
            value: this.lastMessage.value(),
            id: this.lastMessage.id(),
            tag: this.lastMessage.tag(),
        });
    }
    askName({ self }: { self: ActorRefFrom<typeof mockFlowMachine> }) {
        const possibleAnswers = ["Jhon", "Kyle", "Brad"];
        const question = new Question("Whats your name?" , {
            tag: flowQuestionTags.name,
            validator: {
                type: "oneOf",
                values: possibleAnswers
            },
            possibleAnswers,
        });
        this.supporter.ask(question);
        self.send({ type: 'QUESTION', id: question.id(), tag: question.tag(), value: question.value() });
    }
    askAge({ self }: { self: ActorRefFrom<typeof mockFlowMachine> }) {
        const question = new Question('What is your age?', { tag: flowQuestionTags.age });
        this.supporter.ask(question);
        self.send({ type: 'QUESTION', id: question.id(), tag: question.tag(), value: question.value() });
    }
    sendInvalidAge() {
        this.supporter.sendMessage('Invalid age, try again.');
    }
    finish({ context }: { context: FlowContext }) {
        this.supporter.answer(`Nice to meet you ${context.name.value}, age ${context.age.value}`);
    }
    isInvalidAnswer() {
        if (!this.lastQuestion || !(this.lastMessage instanceof Answer)) return false;
        return !this.lastQuestion.isAnswerValid(this.lastMessage);
    }
    sendInvalidName() {
        this.supporter.sendMessage("i dont know you");
    }

    override onDestroy(): void {
        this.actor?.stop();
        super.onDestroy();
    }
}
