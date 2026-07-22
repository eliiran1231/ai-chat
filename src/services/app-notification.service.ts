import { Injectable, inject } from '@angular/core';
import DOMPurify from 'dompurify';

import { Chat } from '../classes/Chat';
import { Message } from '../classes/Message';
import { NotificationSettingsService, NotificationSound } from './notification-settings.service';
import { ElectronService } from './electron.service';
import { LanguageService } from './language.service';

@Injectable({
  providedIn: 'root',
})
export class AppNotificationService {
  private notificationSettingsService = inject(NotificationSettingsService);
  private electronService = inject(ElectronService);
  private languageService = inject(LanguageService);
  private audioContext?: AudioContext;

  async notifySupporterMessage(chat: Chat, message: Message): Promise<void> {
    const settings = this.notificationSettingsService.settings();

    if (!settings.enableNotifications || settings.notifyMe === 'Never') {
      return;
    }

    if (settings.notifyMe === 'Only when minimized' && !(await this.isWindowMinimized())) {
      return;
    }

    this.playSound(settings.notificationSound);

    if (!('Notification' in window)) {
      return;
    }

    const permission =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;

    if (permission !== 'granted') {
      return;
    }

    new Notification(chat.name() || this.languageService.translate('notification.newMessage'), {
      body: settings.showPreview
        ? this.notificationBody(message)
        : this.languageService.translate('notification.newMessage'),
      tag: chat.id(),
      silent: true,
    });
  }

  private notificationBody(message: Message): string {
    return (
      DOMPurify.sanitize(message.value() || message.attachment()?.name || this.languageService.translate('notification.newMessage'), {
        ALLOWED_TAGS: [],
      }) || this.languageService.translate('notification.newMessage')
    );
  }

  private playSound(sound: NotificationSound): void {
    if (sound === 'None') {
      return;
    }

    const audioContext = this.getAudioContext();

    if (!audioContext) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const frequencyBySound: Record<Exclude<NotificationSound, 'None'>, number> = {
      Default: 740,
      Soft: 520,
      Bright: 920,
    };

    oscillator.frequency.value = frequencyBySound[sound];
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.22);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.24);
  }

  private getAudioContext(): AudioContext | undefined {
    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return undefined;
    }

    this.audioContext ??= new AudioContextConstructor();
    return this.audioContext;
  }

  private async isWindowMinimized(): Promise<boolean> {
    if (!this.electronService.isElectronAvailable()) {
      return document.visibilityState !== 'visible';
    }

    try {
      return await this.electronService.invoke<boolean>('system:isWindowMinimized');
    } catch (error) {
      console.warn('Unable to determine the window state for notifications.', error);
      return document.visibilityState !== 'visible';
    }
  }
}
