import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { SettingsService } from '../../services/settings.service';
import { SettingsRow } from './settings-data';
import { ConfirmationDialogService } from '../shared/confirmation-dialog/confirmation-dialog.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private settingsService = inject(SettingsService);
  private confirmationDialog = inject(ConfirmationDialogService);
  readonly editIcon = LucidePenLine;

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

  async handleAction(row: SettingsRow): Promise<void> {
    if (!row.confirmation) {
      return;
    }

    await this.confirmationDialog.confirm(row.confirmation);
  }
}
