import { Injector } from "@angular/core";
import { Agent } from "../../classes/Agent";
import { Chat } from "../../classes/Chat";
import { Question } from "../../classes/Question";
import { Supporter } from "../../classes/Supporter";

export class MockAgent extends Agent {
    constructor(injector: Injector) {
        super(injector);
    }
    override init(chat: Chat, supporter: Supporter) {
        super.init(chat, supporter);
        this.lastQuestion = undefined;
        if (!this.chat.messages.find(msg => msg.tag == "greeting")) {
            this
            const possibleAnswers = ["hi", "hello", "hey"];
            const question = new Question("hello there how can I help you?", {
                validator: {
                    type: "oneOf",
                    values: possibleAnswers
                },
                validationErrorMessage: "i do not understand you",
                possibleAnswers
            });
            question.tag = "greeting"
            this.supporter.ask(question);
            return;
        }
    }
    override async respond(): Promise<void> {
        super.respond();
        if (!this.lastQuestion) return;
        if (this.lastMessage instanceof Question) {
            this.supporter.sendMessage("a supporter will get back to you on that");
            return;
        }

        if (this.lastQuestion.tag == "greeting") {
            this.lastQuestion = new Question("what is your name?", {
                validator: /^[a-zA-Z]+$/,
                validationErrorMessage: "name should only contain letters"
            })
            this.lastQuestion.tag = "name"
        }
        else if (this.lastQuestion.tag == "name") {
            this.lastQuestion = new Question("whats your age?", {
                validator: /^(120|1[0-1][0-9]|[1-9]?[0-9])$/,
                validationErrorMessage: "this isnt a real age"
            })
            this.lastQuestion.tag = "age"
        }
        else if (this.lastQuestion.tag == "age") {
            this.supporter.answer("your data has been submitted")
            return;
        }
        this.supporter.ask(this.lastQuestion)
    }

}