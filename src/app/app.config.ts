import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { MARKED_OPTIONS, provideMarkdown, SANITIZE } from 'ngx-markdown';

import { routes } from './app.routes';
import { AppAgentsModule } from './app-agents.module';
import { provideAgents } from '../services/agents.module';
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
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: './i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'en',
      lang: 'en',
    }),
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
  ],
};
