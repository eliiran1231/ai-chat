import { Message } from "./Message";
import { Supporter } from "./Supporter";

export class Agent{
    messages: Message[] = [];
    supporter: Supporter = new Supporter(this.messages);
    init(messages : Message[], supporter : Supporter) {
        this.messages = messages;
        this.supporter = supporter;
    }
    async respond(): Promise<void> {
        if(this.messages[this.messages.length-1].from == "supporter"){
            console.error("respond was called but there is nothing to respond to. the lasy messgae is from the agent");
            return;
        }
    }
} 