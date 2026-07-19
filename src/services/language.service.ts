import { Injectable, computed, inject, signal } from '@angular/core';
import english from '../../public/languages/en.json';
import { ElectronService } from './electron.service';

export interface LanguageSummary {
  code: string;
  name: string;
  direction: 'ltr' | 'rtl';
}

interface Language extends LanguageSummary { strings: Record<string, string>; }

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly electron = inject(ElectronService);
  private readonly languages: Language[] = [english as Language];
  readonly availableLanguages = signal<LanguageSummary[]>(this.languages);
  readonly isLoading = signal(true);
  private readonly activeLanguage = signal<Language>(this.languages[0]);
  readonly activeLanguageCode = computed(() => this.activeLanguage().code);

  constructor() { void this.load(); }

  async selectLanguage(code: string): Promise<void> {
    const language = this.languages.find((item) => item.code === code);
    if (!language) return;
    this.activeLanguage.set(language);
    document.documentElement.lang = language.code;
    document.documentElement.dir = language.direction;
    localStorage.setItem('ai-chat-language', language.code);
  }

  translate(key: string, params?: Record<string, string | number>): string {
    const template = this.activeLanguage().strings[key] ?? (english as Language).strings[key] ?? key;

    if (!params) {
      return template;
    }

    return Object.entries(params).reduce(
      (translated, [name, value]) => translated.replaceAll(`{${name}}`, String(value)),
      template,
    );
  }

  private async load(): Promise<void> {
    try {
      if (this.electron.isElectronAvailable()) {
        this.languages.splice(0, this.languages.length, ...(await this.electron.invoke<Language[]>('languages:getAll')));
        this.availableLanguages.set(this.languages);
      }
      await this.selectLanguage(localStorage.getItem('ai-chat-language') ?? 'en');
    } catch (error) {
      console.warn('Unable to load language files. Using English.', error);
      await this.selectLanguage('en');
    } finally { this.isLoading.set(false); }
  }
}
