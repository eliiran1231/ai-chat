import { Agent } from "../classes/Agent";
import { Chat } from "../classes/Chat";
import { Question } from "../classes/Question";
import { Supporter } from "../classes/Supporter";

export class MockAgent extends Agent{
    constructor(){
        super()
    }
    override init(chat : Chat, supporter : Supporter) {
        super.init(chat, supporter)
        if (chat.messages.length === 0) {
            supporter.sendMessage("שלום שלום איך אפשר לעזור")
        }
    }
    override async respond(): Promise<void> {
        await super.respond();
        this.supporter.ask("שלום?");
    }
    
}