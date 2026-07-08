import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { AppSettingsService } from '../../services/app-settings.service';
import { SettingsService } from '../../services/settings.service';
import type { SettingsRow } from './settings-data';
import { ConfirmationDialogService } from '../shared/confirmation-dialog/confirmation-dialog.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private appSettingsService = inject(AppSettingsService);
  private settingsService = inject(SettingsService);
  private confirmationDialog = inject(ConfirmationDialogService);
  readonly editIcon = LucidePenLine;
  readonly generalSettings = this.appSettingsService.generalSettings;

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

  async onButtonClick(row: SettingsRow): Promise<void> {
    if (row.confirmation) {
      const confirmed = await this.confirmationDialog.confirm(row.confirmation);

      if (!confirmed) {
        return;
      }
    }

    if (row.action === 'resetGeneralSettings') {
      await this.appSettingsService.resetGeneralSettings();
    }
  }
}
