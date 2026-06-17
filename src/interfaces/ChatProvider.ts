import { Agent } from "../classes/Agent";
import { Chat, ChatOptions } from "../classes/Chat";
import { Uuid } from "./db/Uuid";

export interface ChatProvider {
    createChat(        
        name: string,
        initialAgent: Agent,
        options?: ChatOptions
    ): Chat | Promise<Chat>;
    getChats(): Chat[] | Promise<Chat[]>;
    deleteChat(chatId: Uuid): void | Promise<void> 
}