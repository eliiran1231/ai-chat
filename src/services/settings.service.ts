import { computed, inject, Injectable } from '@angular/core';
import {
  LucideBell,
  LucideIconInput,
  LucideInfo,
  LucideLanguages,
  LucideMessageSquare,
  LucidePalette,
  LucideSettings,
  LucideUser,
} from '@lucide/angular';

import settingsConfig from '../app/settings/settings-config.json';
import {
  SettingsCategory,
  SettingsConfig,
  SettingsIconKey,
  SettingsRow,
  SettingsSection,
  SettingsSectionKey,
} from '../app/settings/settings-data';
import { ProfileService } from './profile.service';
import { AppInfoService } from './app-info.service';
import { LanguageService } from './language.service';

const SETTINGS_ICON_MAP: Record<SettingsIconKey, LucideIconInput> = {
  settings: LucideSettings,
  user: LucideUser,
  bell: LucideBell,
  'message-square': LucideMessageSquare,
  palette: LucidePalette,
  languages: LucideLanguages,
  info: LucideInfo,
};

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly config = settingsConfig as SettingsConfig;
  private readonly profileService = inject(ProfileService);
  private readonly appInfoService = inject(AppInfoService);
  private readonly profileInfo = this.profileService.basicInfo;
  private readonly languageService = inject(LanguageService);

  readonly categories = computed<SettingsCategory[]>(() =>
    this.config.categories.map((category) => ({
      ...category,
      title: this.translate(category.title),
      description: this.translate(category.description),
      icon: SETTINGS_ICON_MAP[category.icon],
    })),
  );

  constructor() {
    void this.loadProfileInfo();
  }

  getSection(category: string | null): SettingsSection {
    const section = this.config.sections[this.toSectionKey(category)];

    return {
      title: this.translate(section.title),
      description: this.translate(section.description),
      rows: section.rows.map((row) => this.translateRow(row)),
    };
  }

  getCategory(category: string | null): SettingsCategory | undefined {
    if (!category) {
      return undefined;
    }

    const sectionKey = this.toSectionKey(category);

    return this.categories().find((item) => item.path === sectionKey);
  }

  isProfileSection(category: string | null): boolean {
    return category === 'profile';
  }

  private async loadProfileInfo(): Promise<void> {
    await this.profileService.loadBasicInfo();
  }

  private toSectionKey(category: string | null): SettingsSectionKey {
    return this.isSettingsSectionKey(category) ? category : 'general';
  }

  private isSettingsSectionKey(category: string | null): category is SettingsSectionKey {
    return Boolean(category && category in this.config.sections);
  }

  private translate(key: string | undefined): string {
    return key ? this.languageService.translate(key) : '';
  }

  private translateRow(row: SettingsRow): SettingsRow {
    return {
      ...row,
      label: this.translate(row.label),
      description: this.rowDescription(row),
      value: row.control === 'button' ? this.translate(row.value) : row.value,
      optionLabels: row.optionLabels?.map((label) => this.translate(label)),
      confirmation: row.confirmation && {
        ...row.confirmation,
        title: this.translate(row.confirmation.title),
        message: this.translate(row.confirmation.message),
        confirmText: row.confirmation.confirmText && this.translate(row.confirmation.confirmText),
        cancelText: row.confirmation.cancelText && this.translate(row.confirmation.cancelText),
      },
    };
  }

  private rowDescription(row: SettingsRow): string {
    if (row.profileField) {
      return this.profileInfo()[row.profileField] || this.translate('common.notAvailable');
    }

    if (row.appInfoField === 'version') {
      return this.appInfoService.version();
    }

    return this.translate(row.description);
  }
}
