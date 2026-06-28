import { Subject } from "rxjs";
import { Agent } from "./Agent";
import { Answer } from "./Answer";
import { Chat } from "./Chat";
import { Message } from "./Message";
import { Question } from "./Question";
import { Uuid } from "../interfaces/db/Uuid";
import { SyncedEntity } from "./SyncedEntity";
import { MessageStatus } from "../enums/MessagesStatus";
import { signal, Signal } from "@angular/core";
import { syncedSignal, SyncedSignal } from "../signals/syncedSignal";

export class Supporter extends SyncedEntity {
    public readonly id!: Signal<Uuid>;
    public readonly onMessageAdded = new Subject<Message>();
    public readonly onAgentSwitch = new Subject<Agent>();
    public readonly onContextChange = new Subject<any>();
    public readonly expects: SyncedSignal<"message" | "question" | "answer">;
    public readonly name: SyncedSignal<string>;
    private _context: any; 
    private chat!: Chat;
    private agent: Agent | undefined;
    
    get context(){
        return this._context;
    }
    constructor(id: Uuid, name?: string, expects?: "message" | "question" | "answer", context?: any){
        super();
        this.id = signal(id);
        this.name = syncedSignal(name ?? "Supporter");
        this.expects = syncedSignal(expects ?? "question");
        if(context) this._context = context;
        this.initSync()
    }

    ask(message : string | Question){
        var question = message instanceof Question ? message : new Question(message);
        if(this.agent) this.agent.lastQuestion = question;
        this.expects.set('answer');
        return this.appendMessage(question);
    }

    answer(message : string | Answer){
        this.expects.set('question');
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
    }

    async setContext(context: any){
        this._context = context;
        await this.saveChanges();
        this.onContextChange.next(context);
    }

    setChat(chat: Chat){
        this.chat = chat;
    }

    private async appendMessage(message: Message){
        message.from.set("supporter");
        message.setChat(this.chat);
        this.chat.messages.update((msgs: Message[]) => [...msgs, message]);
        message.status.set(await this.chat['manager'].requestSend(message));
        if (message.status() === MessageStatus.Failed) {
            return false;
        }
        if(!this.chat.active) this.chat.unreadCount.update((count) => count + 1);
        else message.status.set(MessageStatus.Read);
        this.onMessageAdded.next(message);
        return true;
    }
}
