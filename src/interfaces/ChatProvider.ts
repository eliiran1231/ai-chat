import type { Type } from '@angular/core';
import { Agent } from "../classes/Agent";
import { Chat, ChatOptions } from "../classes/Chat";
import { Message } from "../classes/Message";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { Uuid } from "./db/Uuid";

export interface ChatProviderMetadata {
    id: string;
    displayName: string;
    description: string;
    avatarUrl: string;
    authenticationComponent: Type<unknown>;
}

export interface ChatProvider {
    metadata: ChatProviderMetadata;
    authentication: AuthenticationProvider;
    createChat(        
        name: string,
        initialAgent: Agent,
        options?: ChatOptions
    ): Chat | Promise<Chat>;
    addMessage(chatId: Uuid, message: Message): any | Promise<any>;
    deleteMessage(messageId: Uuid): any | Promise<any>;
    editMessage(message: Message): any | Promise<any>;
    deleteBatch(messageIds: Uuid[]): any | Promise<any>;
    editBatch(messages: Message[]): any | Promise<any>;
    getChats(): Chat[] | Promise<Chat[]>;
    deleteChat(chatId: Uuid): any | Promise<any>;
}
