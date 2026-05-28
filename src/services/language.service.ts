import { computed, effect, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'he';
export type AppDirection = 'ltr' | 'rtl';

export interface AppLanguageOption {
  code: AppLanguage;
  labelKey: string;
  nativeLabel: string;
  direction: AppDirection;
}

const STORAGE_KEY = 'ai-chat-language';

const LANGUAGE_OPTIONS: AppLanguageOption[] = [
  { code: 'en', labelKey: 'language.english', nativeLabel: 'English', direction: 'ltr' },
  { code: 'he', labelKey: 'language.hebrew', nativeLabel: 'עברית', direction: 'rtl' },
];

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  readonly languageOptions = LANGUAGE_OPTIONS;

  private readonly languageSignal = signal<AppLanguage>(this.getInitialLanguage());

  readonly language = this.languageSignal.asReadonly();
  readonly direction = computed(() => this.currentOption.direction);
  readonly isRtl = computed(() => this.direction() === 'rtl');

  constructor(private translate: TranslateService) {
    this.translate.setFallbackLang('en');

    effect(() => {
      const language = this.language();
      const direction = this.direction();

      this.persistLanguage(language);
      this.translate.use(language).subscribe();

      if (typeof document !== 'undefined') {
        document.documentElement.lang = language;
        document.documentElement.dir = direction;
        document.body.dir = direction;
      }
    });
  }

  setLanguage(language: AppLanguage): void {
    if (!this.languageOptions.some((option) => option.code === language)) {
      return;
    }

    this.languageSignal.set(language);
  }

  instant(key: string): string {
    return this.translate.instant(key);
  }

  get currentOption(): AppLanguageOption {
    return this.languageOptions.find((option) => option.code === this.language()) ?? this.languageOptions[0]!;
  }

  private getInitialLanguage(): AppLanguage {
    if (typeof localStorage === 'undefined') {
      return 'en';
    }

    const storedLanguage = localStorage.getItem(STORAGE_KEY);
    return storedLanguage === 'he' || storedLanguage === 'en' ? storedLanguage : 'en';
  }

  private persistLanguage(language: AppLanguage): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, language);
  }
}
