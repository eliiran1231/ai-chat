import { InjectionToken } from '@angular/core';
import { ChatProvider } from '../interfaces/ChatProvider';

/**
 * Multi-provider token for chat providers.
 * Register implementations with `provide: CHAT_PROVIDER, useClass: XxxProvider, multi: true`
 */
export const CHAT_PROVIDER = new InjectionToken<ChatProvider[]>('CHAT_PROVIDER');

// NOTE: previous implementation used a custom decorator and a single-value token.
// This file now exposes the Angular-native `CHAT_PROVIDER` multi token. Consumers
// should register providers with `multi: true` so Angular will construct them.
