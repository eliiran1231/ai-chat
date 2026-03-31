import { Agent } from "../classes/Agent";
import { Message } from "../classes/Message";
import { Supporter } from "../classes/Supporter";

export class MockAgent extends Agent{
    constructor(){
        super()
    }
    override init(messages : Message[], supporter : Supporter) {
        super.init(messages, supporter)
        supporter.sendMessage("שלום שלום איך אפשר לעזור")
    }
    override async respond(): Promise<void> {
        this.supporter.ask("שלום?");
    }
}