import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { SETTINGS_SECTIONS, SettingsRow, SettingsSectionKey } from './settings-data';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import {
  DisplayDensity,
  DisplaySettingKey,
  DisplaySettingsService,
  DisplayTheme,
  MessageBubbleStyle,
} from '../../services/display-settings.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private displaySettingsService = inject(DisplaySettingsService);
  readonly editIcon = LucidePenLine;
  readonly displaySettings = this.displaySettingsService.settings;
  readonly fontSizeDraft = signal(this.displaySettings().fontSize);

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

  rangeValue(row: SettingsRow): number {
    if (row.displaySettingKey === 'fontSize') {
      return this.fontSizeDraft();
    }

    return Number(row.value ?? 0);
  }

  selectValue(row: SettingsRow): string {
    if (row.displaySettingKey && row.displaySettingKey !== 'fontSize') {
      return String(this.displaySettings()[row.displaySettingKey]);
    }

    return row.value ?? '';
  }

  onRangeInput(row: SettingsRow, event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    if (row.displaySettingKey === 'fontSize') {
      this.fontSizeDraft.set(Number(input.value));
      return;
    }

    row.value = input.value;
  }

  applyRange(row: SettingsRow): void {
    if (row.displaySettingKey === 'fontSize') {
      this.displaySettingsService.updateSetting(row.displaySettingKey, this.fontSizeDraft());
    }
  }

  onSelectChange(row: SettingsRow, event: Event): void {
    const select = event.target as HTMLSelectElement | null;

    if (!select) {
      return;
    }

    if (row.displaySettingKey && row.displaySettingKey !== 'fontSize') {
      this.updateDisplaySetting(row.displaySettingKey, select.value);
      return;
    }

    row.value = select.value;
  }

  onButtonClick(row: SettingsRow): void {
    if (row.action === 'resetDisplayPreferences') {
      this.displaySettingsService.resetSettings();
      this.fontSizeDraft.set(this.displaySettings().fontSize);
    }
  }

  private updateDisplaySetting(key: Exclude<DisplaySettingKey, 'fontSize'>, value: string): void {
    if (key === 'theme') {
      this.displaySettingsService.updateSetting(key, value as DisplayTheme);
      return;
    }

    if (key === 'displayDensity') {
      this.displaySettingsService.updateSetting(key, value as DisplayDensity);
      return;
    }

    this.displaySettingsService.updateSetting(key, value as MessageBubbleStyle);
  }
}
