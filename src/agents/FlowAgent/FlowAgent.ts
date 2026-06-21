import { Injector } from "@angular/core";
import { ActorRefFrom, createActor } from "xstate";
import { Agent } from "../../classes/Agent";
import { Answer } from "../../classes/Answer";
import { Chat } from "../../classes/Chat";
import { Question } from "../../classes/Question";
import { Supporter } from "../../classes/Supporter";
import { MockAgent } from "../MockAgent/MockAgent";
import { mockFlowMachine } from "./mockFlow.machine";


export class FlowAgent extends Agent {
    private actions!: Record<string, any>;
    private actor!: ActorRefFrom<typeof mockFlowMachine>;

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
        this.actor = createActor(mockFlowMachine.provide({
            actions: this.actions,
            guards: this.actions,
        }), {
            snapshot: supporter.context.context && supporter.context
        });
        this.actor.subscribe((state) => {
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
        });
    }
    askName() {
        const possibleAnswers = ["Jhon", "Kyle", "Brad"];
        const question = new Question("Whats your name?" , {
            validator: {
                type: "oneOf",
                values: possibleAnswers
            },
            possibleAnswers: possibleAnswers
        });
        this.supporter.ask(question);
    }
    askAge() {
        this.supporter.ask('What is your age?');
    }
    sendInvalidAge() {
        this.supporter.sendMessage('Invalid age, try again.');
    }
    finish(ctx: any) {
        this.supporter.answer(`Nice to meet you ${ctx.context.name}, age ${ctx.context.age}`);
        this.supporter.setAgent(new MockAgent(this.injector));
    }
    isInvalidAnswer() {
        if (!this.lastQuestion || !(this.lastMessage instanceof Answer)) return false;
        return !this.lastQuestion.isAnswerValid(this.lastMessage);
    }
    sendInvalidName() {
        this.supporter.sendMessage("i dont know you");
    }
}
