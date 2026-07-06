import { Injectable, inject, signal } from '@angular/core';

import { ElectronService } from './electron.service';

export interface GeneralSettings {
  startAtLogin: boolean;
  runInBackground: boolean;
}

export type GeneralSettingKey = keyof GeneralSettings;

const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  startAtLogin: false,
  runInBackground: true,
};

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private readonly electronService = inject(ElectronService);

  readonly generalSettings = signal<GeneralSettings>({ ...DEFAULT_GENERAL_SETTINGS });

  constructor() {
    void this.loadGeneralSettings();
  }

  async updateGeneralSetting(key: GeneralSettingKey, value: boolean): Promise<void> {
    const previousSettings = this.generalSettings();

    this.generalSettings.set({
      ...previousSettings,
      [key]: value,
    });

    if (!this.electronService.isElectronAvailable()) {
      return;
    }

    try {
      const settings = await this.electronService.invoke<GeneralSettings>('settings:updateGeneral', {
        [key]: value,
      });
      this.generalSettings.set(settings);
    } catch (error) {
      console.warn('Failed to update app settings.', error);
      this.generalSettings.set(previousSettings);
    }
  }

  async resetGeneralSettings(): Promise<void> {
    const previousSettings = this.generalSettings();

    this.generalSettings.set({ ...DEFAULT_GENERAL_SETTINGS });

    if (!this.electronService.isElectronAvailable()) {
      return;
    }

    try {
      const settings = await this.electronService.invoke<GeneralSettings>('settings:resetGeneral');
      this.generalSettings.set(settings);
    } catch (error) {
      console.warn('Failed to reset app settings.', error);
      this.generalSettings.set(previousSettings);
    }
  }

  private async loadGeneralSettings(): Promise<void> {
    if (!this.electronService.isElectronAvailable()) {
      return;
    }

    try {
      const settings = await this.electronService.invoke<GeneralSettings>('settings:getGeneral');
      this.generalSettings.set(settings);
    } catch (error) {
      console.warn('Failed to load app settings. Using defaults.', error);
    }
  }
}
