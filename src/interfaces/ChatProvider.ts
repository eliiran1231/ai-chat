import { Agent } from "../classes/Agent";
import { Chat, ChatOptions } from "../classes/Chat";
import { ChatManager } from "../classes/ChatManager";
import { Uuid } from "./db/Uuid";

export interface ChatProvider {
    createChat(        
        name: string,
        initialAgent: Agent,
        manager: ChatManager,
        options?: ChatOptions
    ): Chat | Promise<Chat>;
    getChats(): Chat[] | Promise<Chat[]>;
    deleteChat(chatId: Uuid): void | Promise<void> 
}