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

  readonly categories = computed<SettingsCategory[]>(() =>
    this.config.categories.map((category) => ({
      ...category,
      icon: SETTINGS_ICON_MAP[category.icon],
    })),
  );

  constructor() {
    void this.loadProfileInfo();
  }

  getSection(category: string | null): SettingsSection {
    const section = this.config.sections[this.toSectionKey(category)];

    return {
      title: section.title,
      description: section.description,
      rows: section.rows.map((row) => this.resolveRow(row)),
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

  private resolveRow(row: SettingsRow): SettingsRow {
    return {
      ...row,
      description: this.rowDescription(row),
    };
  }

  private rowDescription(row: SettingsRow): string {
    if (row.profileField) {
      return this.profileInfo()[row.profileField] || 'common.notAvailable';
    }

    if (row.appInfoField === 'version') {
      return this.appInfoService.version();
    }

    return row.description;
  }
}
