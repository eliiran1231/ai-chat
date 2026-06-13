import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MARKED_OPTIONS, provideMarkdown, SANITIZE } from 'ngx-markdown';

import { routes } from './app.routes';
import { AppAgentsModule } from './app-agents.module';
import { AppChatManagersModule } from './app-chat-managers.module';
import { provideAgents } from '../services/agents.module';
import { provideChatManagers } from '../services/chat-managers.module';
import DOMPurify from 'dompurify';

DOMPurify.setConfig({
  ALLOWED_TAGS: ['mark'],
  ALLOWED_ATTR: [],
})

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideMarkdown({
      sanitize: {
        provide: SANITIZE,
        useValue: DOMPurify.sanitize
      },
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,
          breaks: true
        },
      },
    }),
    provideRouter(routes),
    provideAgents(AppAgentsModule),
    provideChatManagers(AppChatManagersModule),
  ],
};
