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
    addMessage(chatId: Uuid, message: Message): void | Promise<void>;
    deleteMessage(messageId: Uuid): void | Promise<void>;
    editMessage(message: Message): void | Promise<void>;
    getChats(): Chat[] | Promise<Chat[]>;
    deleteChat(chatId: Uuid): void | Promise<void>;
}
