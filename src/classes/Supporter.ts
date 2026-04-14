import { Agent } from "./Agent";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";

export class Supporter{
    private chat: Chat = null as any;
    private agent: Agent | undefined;
    private onMessageAdded?: (message: Message) => void | Promise<void>;
    public name = "Supporter";
    constructor(){}
    ask(message : string | Question){
        var question = message instanceof Question ? message : new Question(message);
        if(this.agent) this.agent.lastQuestion = question;
        this.appendMessage(question);
    }
    answer(message : string | File | Answer){
        var answer = message instanceof Answer ?
        message :
        new Answer(message);
        this.appendMessage(answer);
    }
    sendMessage(message : string | File | Message){
        var msg = message instanceof Message ? message : new Message(message);
        this.appendMessage(msg);
    }
    async respond(){
        if(!this.agent) {
            console.error("no agent was set! please set an agent to respond to the client"); 
            return;
        }
        await this.agent.respond();
    }
    setAgent(agent: Agent){
        this.agent = agent;
        this.agent.init(this.chat, this);
    }
    setChat(chat: Chat){
        this.chat = chat;
    }
    setOnMessageAdded(onMessageAdded: (message: Message) => void | Promise<void>) {
        this.onMessageAdded = onMessageAdded;
    }
    private appendMessage(message: Message){
        message.from = "supporter";
        this.chat.messages.push(message);
        if(!this.chat.active) this.chat.unreadCount++;
        else message.isRead = true;
        void this.onMessageAdded?.(message);
    }
}
