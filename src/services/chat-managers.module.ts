import { InjectionToken, Provider, Type } from '@angular/core';
import { ChatManager } from '../classes/ChatManager';

export interface ChatManagersModuleMetadata {
  managers: Record<string, Type<ChatManager>>;
}

const CHAT_MANAGERS_MODULE_METADATA = Symbol('CHAT_MANAGERS_MODULE_METADATA');

export const REGISTERED_CHAT_MANAGERS = new InjectionToken<Record<string, Type<ChatManager>>>(
  'REGISTERED_CHAT_MANAGERS',
);

export function ChatManagersModule(metadata: ChatManagersModuleMetadata): ClassDecorator {
  return (target) => {
    Object.defineProperty(target, CHAT_MANAGERS_MODULE_METADATA, {
      value: metadata,
      writable: false,
    });
  };
}

export function provideChatManagers(moduleType: Type<unknown>): Provider {
  const metadata = (moduleType as { [CHAT_MANAGERS_MODULE_METADATA]?: ChatManagersModuleMetadata })[
    CHAT_MANAGERS_MODULE_METADATA
  ];

  if (!metadata) {
    throw new Error(`${moduleType.name} is missing @ChatManagersModule metadata.`);
  }

  return {
    provide: REGISTERED_CHAT_MANAGERS,
    useValue: metadata.managers,
  };
}