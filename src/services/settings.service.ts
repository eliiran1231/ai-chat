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
  SettingsCategoryConfig,
  SettingsConfig,
  SettingsIconKey,
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
      ...this.translateCategory(category),
      icon: SETTINGS_ICON_MAP[category.icon],
    })),
  );

  constructor() {
    void this.loadProfileInfo();
  }

  getSection(category: string | null): SettingsSection {
    const sectionKey = this.toSectionKey(category);
    const section = this.translateSection(this.config.sections[sectionKey]);

    if (sectionKey !== 'profile') {
      if (sectionKey !== 'about') {
        return section;
      }

      return {
        ...section,
        rows: section.rows.map((row, index) =>
          this.config.sections.about.rows[index]?.label === 'Version'
            ? { ...row, description: this.appInfoService.version() }
            : row,
        ),
      };
    }

    const basicInfo = this.profileInfo();

    return {
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        description: row.profileField
          ? basicInfo[row.profileField] || this.languageService.translate('common.notAvailable')
          : row.description,
      })),
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

  private translateCategory(category: SettingsConfig['categories'][number]): SettingsCategoryConfig {
    return { ...category, title: this.languageService.translate(category.title), description: this.languageService.translate(category.description) };
  }

  private translateSection(section: SettingsSection): SettingsSection {
    return {
      ...section,
      title: this.languageService.translate(section.title),
      description: this.languageService.translate(section.description),
      rows: section.rows.map((row) => ({
        ...row,
        label: this.languageService.translate(row.label),
        description: this.languageService.translate(row.description),
        value: row.control === 'button' && row.value ? this.languageService.translate(row.value) : row.value,
        options: row.options,
        optionLabels: row.options?.map((option) => this.languageService.translate(option)),
        confirmation: row.confirmation && {
          ...row.confirmation,
          title: this.languageService.translate(row.confirmation.title),
          message: this.languageService.translate(row.confirmation.message),
          confirmText: row.confirmation.confirmText && this.languageService.translate(row.confirmation.confirmText),
          cancelText: row.confirmation.cancelText && this.languageService.translate(row.confirmation.cancelText),
        },
      })),
    };
  }
}
