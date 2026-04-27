import { BehaviorSubject } from "rxjs";
import { Agent } from "./Agent";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";

export class Supporter{
    private chat!: Chat;
    private agent: Agent | undefined;
    public readonly onMessageAdded = new BehaviorSubject<Message | null>(null);
    public readonly onAgentSwitch = new BehaviorSubject<Agent | null>(null);
    public readonly onContextChange = new BehaviorSubject<any>(null);
    private _context: any; 
    public name = "Supporter";
    public id?: number;
    get context(){
        return this._context;
    }
    constructor(){}

    
    ask(message : string | Question){
        var question = message instanceof Question ? message : new Question(message);
        if(this.agent) this.agent.lastQuestion = question;
        this.appendMessage(question);
    }
    answer(message : string | Answer){
        var answer = message instanceof Answer ?
        message :
        new Answer(message);
        this.appendMessage(answer);
    }
    sendMessage(message : string | Message){
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
        this.onAgentSwitch.next(agent);
    }
    setContext(context: string){
        this._context = context;
        this.onContextChange.next(context);
    }
    setChat(chat: Chat){
        this.chat = chat;
    }
    private appendMessage(message: Message){
        message.from = "supporter";
        this.chat.messages.push(message);
        if(!this.chat.active) this.chat.unreadCount++;
        else message.isRead = true;
        this.onMessageAdded.next(message);
    }
}
