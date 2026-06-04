import { Subject } from "rxjs";
import { Agent } from "./Agent";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Uuid } from "../interfaces/db/Uuid";
import { DBEntity } from "./DBEntity";

export class Supporter extends DBEntity {
    public id!: Uuid;
    private chat!: Chat;
    private agent: Agent | undefined;
    public readonly onMessageAdded = new Subject<Message>();
    public readonly onAgentSwitch = new Subject<Agent>();
    public readonly onContextChange = new Subject<any>();
    public expects: "message" | "question" | "answer";
    private _context: any; 
    public name;
    
    get context(){
        return this._context;
    }
    constructor(id?: Uuid, name?: string, expects?: "message" | "question" | "answer", context?: any){
        super();
        if(id) this.id = id;
        this.name = name ?? "Supporter";
        this.expects = expects ?? "question";
        if(context) this._context = context;
    }

    
    ask(message : string | Question){
        var question = message instanceof Question ? message : new Question(message);
        if(this.agent) this.agent.lastQuestion = question;
        this.expects = 'answer';
        this.appendMessage(question);
    }
    answer(message : string | Answer){
        this.expects = 'question';
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
    async setAgent(agent: Agent){
        await this.agent?.onDestroy();
        this.agent = agent;
        this.agent.init(this.chat, this);
        this.onAgentSwitch.next(agent);
        this.enableDbChanges();
    }
    async setContext(context: any){
        this._context = context;
        await this.saveChanges();
        this.onContextChange.next(context);
    }
    setChat(chat: Chat){
        this.chat = chat;
    }
    private appendMessage(message: Message){
        message.from = "supporter";
        message.setChat(this.chat);
        this.chat.messages.push(message);
        if(!this.chat.active) this.chat.unreadCount++;
        else message.isRead = true;
        this.onMessageAdded.next(message);
    }
}
