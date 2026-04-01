import { Agent } from "./Agent";
import { Answer } from "./Answer";
import { Chat } from "./chat";
import { Message } from "./Message";
import { Question } from "./Question";

export class Supporter{
    private chat: Chat = null as any;
    private agent: Agent | undefined;
    name = "Supporter";
    constructor(){}
    ask(message : string | File, time? : Date, tag? : string){
        var question = new Question(message, "supporter");
        if(time) question.time = time;
        if(tag) question.tag = tag;
        this.chat.messages.push(question);
    }
    answer(message : string | File, time? : Date, tag? : string){
        var answer = new Answer(message, "supporter");
        if(time) answer.time = time;
        if(tag) answer.tag = tag;
        this.chat.messages.push(answer);
    }
    sendMessage(message : string | File, time? : Date, tag? : string){
        var msg = new Message(message, "supporter");
        if(time) msg.time = time;
        if(tag) msg.tag = tag;
        this.chat.messages.push(msg);
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
}