import { Injectable, signal } from '@angular/core';

export interface ChatSettings {
  enterSendsMessage: boolean;
}

export type ChatSettingKey = keyof ChatSettings;

type StoredChatSettings = Partial<ChatSettings> & {
  sendShortcut?: 'Enter to send' | 'Ctrl + Enter to send';
};

const STORAGE_KEY = 'ai-chat-chat-settings';

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  enterSendsMessage: true,
};

@Injectable({
  providedIn: 'root',
})
export class ChatSettingsService {
  readonly settings = signal<ChatSettings>(this.loadSettings());

  updateSetting<K extends ChatSettingKey>(key: K, value: ChatSettings[K]): void {
    const nextSettings = {
      ...this.settings(),
      [key]: value,
    };

    this.settings.set(nextSettings);
    this.saveSettings(nextSettings);
  }

  private loadSettings(): ChatSettings {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);

      if (!storedSettings) {
        return { ...DEFAULT_CHAT_SETTINGS };
      }

      const parsedSettings = JSON.parse(storedSettings);

      return {
        enterSendsMessage: this.resolveEnterSendsMessage(parsedSettings),
      };
    } catch {
      return { ...DEFAULT_CHAT_SETTINGS };
    }
  }

  private resolveEnterSendsMessage(storedSettings: StoredChatSettings): boolean {
    if (typeof storedSettings.enterSendsMessage === 'boolean') {
      return storedSettings.enterSendsMessage;
    }

    if (storedSettings.sendShortcut === 'Enter to send') {
      return true;
    }

    if (storedSettings.sendShortcut === 'Ctrl + Enter to send') {
      return false;
    }

    return DEFAULT_CHAT_SETTINGS.enterSendsMessage;
  }

  private saveSettings(settings: ChatSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Unable to save chat settings locally:', error);
    }
  }
}
