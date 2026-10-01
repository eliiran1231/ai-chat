import type { Type } from '@angular/core';
import { Agent } from "../classes/Agent";
import { Chat, ChatOptions } from "../classes/Chat";
import { Message } from "../classes/Message";
import { AuthenticationProvider } from "./auth/AuthenticationProvider";
import { Uuid } from "./db/Uuid";
import { Unsent } from '../app/types/Unsent';

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
    addMessage(chatId: Uuid, message: Unsent<Message>, ...args: unknown[]): any | Promise<any>;
    deleteMessage(messageId: Uuid, ...args: unknown[]): any | Promise<any>;
    editMessage(message: Message, ...args: unknown[]): any | Promise<any>;
    deleteBatch(messageIds: Uuid[], ...args: unknown[]): any | Promise<any>;
    editBatch(messages: Message[], ...args: unknown[]): any | Promise<any>;
    getChats(): Chat[] | Promise<Chat[]>;
    deleteChat(chatId: Uuid, ...args: unknown[]): any | Promise<any>;
}
