import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { NotificationSettingsService } from '../../services/notification-settings.service';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
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
  private notificationSettingsService = inject(NotificationSettingsService);
  private settingsService = inject(SettingsService);

  readonly editIcon = LucidePenLine;
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

  isNotificationControlDisabled(row: SettingsRow): boolean {
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
}
