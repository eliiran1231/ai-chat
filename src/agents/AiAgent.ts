import { Agent } from "../classes/Agent";
import { Message } from "../classes/Message";
import { Supporter } from "../classes/Supporter";
import { AiService } from "../services/ai.service";

export class AiAgent extends Agent{
    constructor(private aiService: AiService){
        super()
    }
    override init(messages : Message[], supporter : Supporter) {
        super.init(messages, supporter)
        supporter.sendMessage("שלום שלום איך אפשר לעזור")
    }
    override async respond(): Promise<void> {
        this.aiService.sendMessage(this.messages[this.messages.length - 1].value as string).subscribe((response) => {
            const aiMessage = response.choices[0].message.content;
            this.supporter.sendMessage(aiMessage);
        });
    }
}