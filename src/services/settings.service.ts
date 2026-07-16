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
  SettingsSection,
  SettingsSectionKey,
} from '../app/settings/settings-data';
import { ProfileService } from './profile.service';

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
    const sectionKey = this.toSectionKey(category);
    const section = this.config.sections[sectionKey];

    if (sectionKey !== 'profile') {
      return section;
    }

    const basicInfo = this.profileInfo();

    return {
      ...section,
      rows: section.rows.map((row) => ({
        ...row,
        description: row.profileField
          ? basicInfo[row.profileField] || 'Not available'
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
}
