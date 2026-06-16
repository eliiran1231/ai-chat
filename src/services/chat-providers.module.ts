import { InjectionToken, Provider, Type } from '@angular/core';
import { ChatProvider } from '../interfaces/ChatProvider';

export interface ChatProvidersModuleMetadata {
  providers: Type<ChatProvider>[];
}

const CHAT_PROVIDERS_MODULE_METADATA = Symbol('CHAT_PROVIDERS_MODULE_METADATA');

export const REGISTERED_CHAT_PROVIDERS = new InjectionToken<Type<ChatProvider>[]>(
  'REGISTERED_CHAT_PROVIDERS',
);

export function ChatProvidersModule(metadata: ChatProvidersModuleMetadata): ClassDecorator {
  return (target) => {
    Object.defineProperty(target, CHAT_PROVIDERS_MODULE_METADATA, {
      value: metadata,
      writable: false,
    });
  };
}

export function provideChatProviders(moduleType: Type<unknown>): Provider {
  const metadata = (moduleType as { [CHAT_PROVIDERS_MODULE_METADATA]?: ChatProvidersModuleMetadata })[
    CHAT_PROVIDERS_MODULE_METADATA
  ];

  if (!metadata) {
    throw new Error(`${moduleType.name} is missing @ChatProvidersModule metadata.`);
  }

  return {
    provide: REGISTERED_CHAT_PROVIDERS,
    useValue: metadata.providers,
  };
}