import { Chat } from "./chat";
import { Supporter } from "./Supporter";

export class Agent{
    chat: Chat = null as any;
    supporter: Supporter = new Supporter();
    init(chat : Chat, supporter : Supporter) {
        this.chat = chat;
        this.supporter = supporter;
    }
    async respond(): Promise<void> {
        if(this.chat.messages[this.chat.messages.length-1].from == "supporter"){
            throw new Error("respond was called but there is nothing to respond to. the last message is from the agent");
        }
    }
} 