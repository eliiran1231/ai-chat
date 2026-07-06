import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { SETTINGS_SECTIONS, SettingsRow, SettingsSectionKey } from './settings-data';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { NotificationSettingsService } from '../../services/notification-settings.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private notificationSettingsService = inject(NotificationSettingsService);
  readonly editIcon = LucidePenLine;
  readonly notificationSettings = this.notificationSettingsService.settings;

  readonly sectionKey = toSignal(
    this.route.data.pipe(map((data) => data['section'] as SettingsSectionKey)),
    {
      initialValue: this.route.snapshot.data['section'] as SettingsSectionKey,
    },
  );

  readonly section = computed(() => {
    const sectionKey = this.sectionKey();

    if (!sectionKey) {
      return SETTINGS_SECTIONS['general'];
    }

    return SETTINGS_SECTIONS[sectionKey];
  });

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
