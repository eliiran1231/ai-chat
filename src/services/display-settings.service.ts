import { Injectable, signal } from '@angular/core';

export type DisplayTheme = 'System' | 'Light' | 'Dark';
export type DisplayDensity = 'Comfortable' | 'Compact' | 'Spacious';
export type MessageBubbleStyle = 'Default' | 'Rounded' | 'Minimal';

export interface DisplaySettings {
  fontSize: number;
  theme: DisplayTheme;
  displayDensity: DisplayDensity;
  messageBubbleStyle: MessageBubbleStyle;
}

export type DisplaySettingKey = keyof DisplaySettings;

const STORAGE_KEY = 'ai-chat-display-settings';
const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  fontSize: 16,
  theme: 'System',
  displayDensity: 'Comfortable',
  messageBubbleStyle: 'Default',
};

@Injectable({
  providedIn: 'root',
})
export class DisplaySettingsService {
  readonly settings = signal<DisplaySettings>(this.loadSettings());

  constructor() {
    this.applySettings(this.settings());
  }

  updateSetting<K extends DisplaySettingKey>(key: K, value: DisplaySettings[K]): void {
    const nextSettings = {
      ...this.settings(),
      [key]: value,
    };

    this.settings.set(nextSettings);
    this.saveSettings(nextSettings);
    this.applySettings(nextSettings);
  }

  resetSettings(): void {
    const nextSettings = { ...DEFAULT_DISPLAY_SETTINGS };

    this.settings.set(nextSettings);
    this.saveSettings(nextSettings);
    this.applySettings(nextSettings);
  }

  private loadSettings(): DisplaySettings {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);

      if (!storedSettings) {
        return { ...DEFAULT_DISPLAY_SETTINGS };
      }

      const parsedSettings = JSON.parse(storedSettings);

      return {
        fontSize: this.resolveFontSize(parsedSettings.fontSize),
        theme: this.resolveOption(parsedSettings.theme, ['System', 'Light', 'Dark'], DEFAULT_DISPLAY_SETTINGS.theme),
        displayDensity: this.resolveOption(
          parsedSettings.displayDensity,
          ['Comfortable', 'Compact', 'Spacious'],
          DEFAULT_DISPLAY_SETTINGS.displayDensity,
        ),
        messageBubbleStyle: this.resolveOption(
          parsedSettings.messageBubbleStyle,
          ['Default', 'Rounded', 'Minimal'],
          DEFAULT_DISPLAY_SETTINGS.messageBubbleStyle,
        ),
      };
    } catch {
      return { ...DEFAULT_DISPLAY_SETTINGS };
    }
  }

  private resolveOption<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
    return options.includes(value as T) ? value as T : fallback;
  }

  private resolveFontSize(value: unknown): number {
    const fontSize = Number(value);

    if (Number.isFinite(fontSize)) {
      return Math.min(22, Math.max(12, fontSize));
    }

    return DEFAULT_DISPLAY_SETTINGS.fontSize;
  }

  private saveSettings(settings: DisplaySettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Unable to save display settings locally:', error);
    }
  }

  private applySettings(settings: DisplaySettings): void {
    const root = document.documentElement;

    root.style.setProperty('--app-font-size', `${settings.fontSize}px`);
    root.dataset['appTheme'] = settings.theme;
    root.dataset['appDensity'] = settings.displayDensity;
    root.dataset['messageBubbleStyle'] = settings.messageBubbleStyle;
  }
}
