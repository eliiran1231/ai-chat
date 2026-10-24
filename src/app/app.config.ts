import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routerFeaturesForProtocol } from './router-features';
import { MARKED_OPTIONS, provideMarkdown, SANITIZE } from 'ngx-markdown';
import { routes } from './app.routes';
import { AppAgentsModule } from './app-agents.module';
import { provideAgents } from '../services/agents.module';
import { AppChatProvidersModule } from './app-chat-providers.module';
import { importProvidersFrom } from '@angular/core';
import { sanitizeMarkdown } from '../utils/sanitize-markdown';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideMarkdown({
      sanitize: {
        provide: SANITIZE,
        useValue: sanitizeMarkdown
      },
      markedOptions: {
        provide: MARKED_OPTIONS,
        useValue: {
          gfm: true,
          breaks: true
        },
      },
    }),
    // Only file:// desktop builds need hash routes; HTTP(S) keeps browser path routing.
    provideRouter(routes, ...routerFeaturesForProtocol(globalThis.location?.protocol)),
    provideAgents(AppAgentsModule),
    importProvidersFrom(AppChatProvidersModule),
  ],
};
