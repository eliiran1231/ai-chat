import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { AppSettingsService } from '../../services/app-settings.service';
import { NotificationSettingsService } from '../../services/notification-settings.service';
import { ProfileService } from '../../services/profile.service';
import { SettingsService } from '../../services/settings.service';
import type { SettingsRow } from './settings-data';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private appSettingsService = inject(AppSettingsService);
  private notificationSettingsService = inject(NotificationSettingsService);
  private profileService = inject(ProfileService);
  private settingsService = inject(SettingsService);

  readonly editIcon = LucidePenLine;
  readonly generalSettings = this.appSettingsService.generalSettings;
  readonly notificationSettings = this.notificationSettingsService.settings;

  readonly sectionKey = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('category'))),
    {
      initialValue: this.route.snapshot.paramMap.get('category'),
    },
  );

  readonly section = computed(() => this.settingsService.getSection(this.sectionKey()));
  readonly isProfileSection = computed(() =>
    this.settingsService.isProfileSection(this.sectionKey()),
  );

  isToggleChecked(row: SettingsRow): boolean {
    if (this.sectionKey() === 'general' && row.settingKey) {
      return this.generalSettings()[row.settingKey];
    }

    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      const value = this.notificationSettings()[row.notificationSettingKey];
      return typeof value === 'boolean' ? value : false;
    }

    return Boolean(row.checked);
  }

  selectValue(row: SettingsRow): string {
    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      return String(this.notificationSettings()[row.notificationSettingKey]);
    }

    return row.value ?? '';
  }

  isControlDisabled(row: SettingsRow): boolean {
    return (
      this.sectionKey() === 'notifications' &&
      row.notificationSettingKey !== undefined &&
      row.notificationSettingKey !== 'enableNotifications' &&
      !this.notificationSettings().enableNotifications
    );
  }

  onToggleChange(row: SettingsRow, event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    if (this.sectionKey() === 'general' && row.settingKey) {
      void this.appSettingsService.updateGeneralSetting(row.settingKey, input.checked);
      return;
    }

    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      this.notificationSettingsService.updateSetting(row.notificationSettingKey, input.checked);
      return;
    }

    row.checked = input.checked;
  }

  onSelectChange(row: SettingsRow, event: Event): void {
    const select = event.target as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      this.notificationSettingsService.updateSetting(row.notificationSettingKey, select.value);
      return;
    }

    row.value = select.value;
  }

  onButtonClick(row: SettingsRow): void {
    if (row.action === 'resetGeneralSettings') {
      void this.appSettingsService.resetGeneralSettings();
    }
  }

  onProfilePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!input || !file || !file.type.startsWith('image/')) {
      return;
    }

    void this.profileService.setProfilePhoto(file);
    input.value = '';
  }
}
