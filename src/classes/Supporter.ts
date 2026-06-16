import { Subject } from "rxjs";
import { Agent } from "./Agent";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Uuid } from "../interfaces/db/Uuid";
import { DBEntity, dbProperty } from "./DBEntity";
import { MessageStatus } from "../enums/MessagesStatus";

export class Supporter extends DBEntity {
    public id!: Uuid;
    private chat!: Chat;
    private agent: Agent | undefined;
    public readonly onMessageAdded = new Subject<Message>();
    public readonly onAgentSwitch = new Subject<Agent>();
    public readonly onContextChange = new Subject<any>();
    @dbProperty
    public expects: "message" | "question" | "answer";
    private _context: any; 
    @dbProperty
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
        return this.appendMessage(question);
    }
    answer(message : string | Answer){
        this.expects = 'question';
        var answer = message instanceof Answer ?
        message :
        new Answer(message);
        return this.appendMessage(answer);
    }
    async sendMessage(message : string | Message){
        var msg = message instanceof Message ? message : new Message(message);
        return this.appendMessage(msg);
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
        await this.agent.init(this.chat, this);
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
    suggestAnswer(suggestedAnswer: string){
        this.chat.draftMessage = suggestedAnswer;
    }
    private async appendMessage(message: Message){
        message.from = "supporter";
        message.setChat(this.chat);
        message.status = MessageStatus.Pending;
        this.chat.messages.push(message);
        message.status = await this.chat.manager?.requestSend(message) || MessageStatus.Read;
        if (message.status === MessageStatus.Failed) {
            return false;
        }
        if(!this.chat.active) this.chat.unreadCount++;
        else message.status = MessageStatus.Read;
        this.onMessageAdded.next(message);
        return true;
    }
}
