import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface GeneralSettings {
  startAtLogin: boolean;
  runInBackground: boolean;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  startAtLogin: false,
  runInBackground: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeGeneralSettings(value: unknown): GeneralSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_GENERAL_SETTINGS };
  }

  return {
    startAtLogin:
      typeof value['startAtLogin'] === 'boolean'
        ? value['startAtLogin']
        : DEFAULT_GENERAL_SETTINGS.startAtLogin,
    runInBackground:
      typeof value['runInBackground'] === 'boolean'
        ? value['runInBackground']
        : DEFAULT_GENERAL_SETTINGS.runInBackground,
  };
}

export class AppSettingsService {
  private generalSettings: GeneralSettings = { ...DEFAULT_GENERAL_SETTINGS };
  private pendingWrite: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    await this.load();
    this.applyStartAtLogin();
  }

  getGeneralSettings(): GeneralSettings {
    return {
      ...this.generalSettings,
      startAtLogin: app.getLoginItemSettings().openAtLogin,
    };
  }

  shouldRunInBackground(): boolean {
    return this.generalSettings.runInBackground;
  }

  async updateGeneralSettings(settings: Partial<GeneralSettings>): Promise<GeneralSettings> {
    return this.queueUpdate(() => {
      this.generalSettings = normalizeGeneralSettings({ ...this.generalSettings, ...settings });
      this.applyStartAtLogin();
    });
  }

  async resetGeneralSettings(): Promise<GeneralSettings> {
    return this.queueUpdate(() => {
      this.generalSettings = { ...DEFAULT_GENERAL_SETTINGS };
      this.applyStartAtLogin();
    });
  }

  private async load(): Promise<void> {
    try {
      const rawSettings = await fs.readFile(this.settingsPath, 'utf8');
      this.generalSettings = normalizeGeneralSettings(JSON.parse(rawSettings));
    } catch (error) {
      const code = isRecord(error) ? error['code'] : undefined;

      if (code !== 'ENOENT') {
        console.warn('Failed to load app settings. Using defaults.', error);
      }

      this.generalSettings = { ...DEFAULT_GENERAL_SETTINGS };
    }
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.settingsPath), { recursive: true });
    await fs.writeFile(this.settingsPath, JSON.stringify(this.generalSettings, null, 2), 'utf8');
  }

  private queueUpdate(update: () => void): Promise<GeneralSettings> {
    const result = this.pendingWrite.then(async () => {
      update();
      await this.save();
      return this.getGeneralSettings();
    });

    this.pendingWrite = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private applyStartAtLogin(): void {
    app.setLoginItemSettings({
      openAtLogin: this.generalSettings.startAtLogin,
    });
  }

  private get settingsPath(): string {
    return path.join(app.getPath('userData'), 'settings.json');
  }
}

export const appSettingsService = new AppSettingsService();
