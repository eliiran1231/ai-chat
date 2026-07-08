import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import type { SettingsRow } from './settings-data';
import { ChatAvatarComponent } from '../shared/chat-avatar/chat-avatar';
import { SettingsService } from '../../services/settings.service';
import {
  DisplayDensity,
  DisplaySettingKey,
  DisplaySettingsService,
  DisplayTheme,
  MessageBubbleStyle,
} from '../../services/display-settings.service';
import { ConfirmationDialogService } from '../shared/confirmation-dialog/confirmation-dialog.service';

@Component({
  selector: 'app-settings-section',
  imports: [ChatAvatarComponent, FormsModule, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private settingsService = inject(SettingsService);
  private displaySettingsService = inject(DisplaySettingsService);
  private confirmationDialog = inject(ConfirmationDialogService);
  readonly editIcon = LucidePenLine;
  readonly displaySettings = this.displaySettingsService.settings;
  readonly fontSizeDraft = signal(this.displaySettings().fontSize);

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
  readonly profileAvatarLabel = computed(() => {
    const rows = this.section().rows;
    const displayName = rows.find((row) => row.profileField === 'displayName')?.description;
    const username = rows.find((row) => row.profileField === 'username')?.description;

    return [displayName, username].find((value) => value && value !== 'Not available') ?? '';
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

  onSelectChange(row: SettingsRow, value: string): void {
    if (row.displaySettingKey && row.displaySettingKey !== 'fontSize') {
      this.updateDisplaySetting(row.displaySettingKey, value);
      return;
    }

    row.value = value;
  }

  async onButtonClick(row: SettingsRow): Promise<void> {
    if (row.confirmation) {
      const confirmed = await this.confirmationDialog.confirm(row.confirmation);

      if (!confirmed) {
        return;
      }
    }

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
