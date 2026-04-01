import { Agent } from "../classes/Agent";
import { Chat } from "../classes/chat";
import { Supporter } from "../classes/Supporter";

export class MockAgent extends Agent{
    constructor(){
        super()
    }
    override init(chat : Chat, supporter : Supporter) {
        super.init(chat, supporter)
        supporter.sendMessage("שלום שלום איך אפשר לעזור")
    }
    override async respond(): Promise<void> {
        this.supporter.ask("שלום?");
    }
}