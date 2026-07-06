import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { SETTINGS_SECTIONS } from './settings-data';
import type { SettingsRow, SettingsSectionKey } from './settings-data';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { AppSettingsService } from '../../services/app-settings.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private appSettingsService = inject(AppSettingsService);
  readonly editIcon = LucidePenLine;
  readonly generalSettings = this.appSettingsService.generalSettings;

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
    if (this.sectionKey() === 'general' && row.settingKey) {
      return this.generalSettings()[row.settingKey];
    }

    return Boolean(row.checked);
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

    row.checked = input.checked;
  }

  onButtonClick(row: SettingsRow): void {
    if (row.action === 'resetGeneralSettings') {
      void this.appSettingsService.resetGeneralSettings();
    }
  }
}
