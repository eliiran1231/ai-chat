import { Agent } from "../classes/Agent";
import { Chat } from "../classes/Chat";
import { Question } from "../classes/Question";
import { Supporter } from "../classes/Supporter";

export class MockAgent extends Agent {
    constructor() {
        super()
    }
    override init(chat: Chat, supporter: Supporter) {
        super.init(chat, supporter)
        if (chat.messages.length === 0) {
            const possibleAnswers = ["hi", "hello", "hey"];
            this.lastQuestion = new Question("hello there how can I help you?", {
                validator: {
                    type: "oneOf",
                    values: possibleAnswers
                },
                validationErrorMessage: "i do not understand you",
                possibleAnswers
            });
            this.lastQuestion.tag = "greeting";
            supporter.ask(this.lastQuestion);
        }
    }
    override async respond(): Promise<void> {
        super.respond();
        if(!this.lastQuestion) return;
        if (this.lastQuestion.tag == "greeting") {
            this.lastQuestion = new Question("what is your name?", {
                validator: /^[a-zA-Z]+$/,
                validationErrorMessage: "name should only contain letters"
            })
            this.lastQuestion.tag = "name"
        }
        else if(this.lastQuestion.tag == "name"){
            this.lastQuestion = new Question("whats your age?",{
                validator: /^(120|1[0-1][0-9]|[1-9]?[0-9])$/,
                validationErrorMessage: "this isnt a real age"
            })
            this.lastQuestion.tag = "age"
        }
        else if(this.lastQuestion.tag == "age"){
            this.supporter.answer("your data has been submitted")
            return;
        }
        this.supporter.ask(this.lastQuestion)
    }

}