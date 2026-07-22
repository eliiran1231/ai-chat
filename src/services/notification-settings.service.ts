import { Injectable, signal } from '@angular/core';

export type NotificationTiming = 'Always' | 'Only when minimized' | 'Never';
export type NotificationSound = 'Default' | 'Soft' | 'Bright' | 'None';

export interface NotificationSettings {
  enableNotifications: boolean;
  notifyMe: NotificationTiming;
  showPreview: boolean;
  notificationSound: NotificationSound;
}

export type NotificationSettingKey = keyof NotificationSettings;

const STORAGE_KEY = 'ai-chat-notification-settings';

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enableNotifications: true,
  notifyMe: 'Always',
  showPreview: true,
  notificationSound: 'Default',
};

@Injectable({
  providedIn: 'root',
})
export class NotificationSettingsService {
  readonly settings = signal<NotificationSettings>(this.loadSettings());

  updateSetting(key: NotificationSettingKey, value: boolean | string): void {
    this.update({ [key]: value } as Partial<NotificationSettings>);
  }

  update(settings: Partial<NotificationSettings>): void {
    const nextSettings = {
      ...this.settings(),
      ...settings,
    };

    this.settings.set(nextSettings);
    this.saveSettings(nextSettings);
  }

  reset(): void {
    this.settings.set({ ...DEFAULT_NOTIFICATION_SETTINGS });
    this.saveSettings(this.settings());
  }

  private loadSettings(): NotificationSettings {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);

      if (!storedSettings) {
        return { ...DEFAULT_NOTIFICATION_SETTINGS };
      }

      return {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        ...JSON.parse(storedSettings),
      };
    } catch {
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
  }

  private saveSettings(settings: NotificationSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.warn('Unable to save notification settings locally:', error);
    }
  }
}
