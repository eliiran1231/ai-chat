import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { App } from './app';
import { TranslatePipe } from './shared/translate.pipe';
import { REGISTERED_AGENTS } from '../services/agents.module';
import { CHAT_PROVIDER } from '../services/chat-providers.module';
import { ElectronService } from '../services/electron.service';
import { LanguageService } from '../services/language.service';

const TEST_LANGUAGES = [
  { code: 'en', name: 'English', direction: 'ltr', strings: { 'settings.title': 'Settings' } },
  { code: 'xx', name: 'Test', direction: 'rtl', strings: { 'settings.title': 'Translated title' } },
];

@Component({
  selector: 'app-translated-route',
  imports: [TranslatePipe],
  template: `<p>{{ 'settings.title' | translate }}</p>`,
})
class TranslatedRouteComponent {}

describe('App language switching', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([{ path: '**', component: TranslatedRouteComponent }]),
        { provide: REGISTERED_AGENTS, useValue: {} },
        { provide: CHAT_PROVIDER, useValue: { getChats: () => [] }, multi: true },
        {
          provide: ElectronService,
          useValue: {
            isElectronAvailable: () => true,
            on: () => () => {},
            invoke: (channel: string) =>
              channel === 'languages:getAll'
                ? Promise.resolve(TEST_LANGUAGES)
                : Promise.reject(new Error(`Unhandled channel ${channel}`)),
          },
        },
      ],
    }).compileComponents();
  });

  it('re-renders translations of the pure translate pipe when the language changes', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Settings');

    await TestBed.inject(LanguageService).selectLanguage('xx');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Translated title');
    expect(document.documentElement.dir).toBe('rtl');
  });

  it('keeps the routed view rendered when the stored language resolves during startup', async () => {
    localStorage.setItem('ai-chat-language', 'xx');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Translated title');
  });
});
