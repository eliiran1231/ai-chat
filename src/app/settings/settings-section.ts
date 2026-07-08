import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { ChatSettingsService } from '../../services/chat-settings.service';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
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
  private chatService = inject(ChatService);
  private chatSettingsService = inject(ChatSettingsService);
  private settingsService = inject(SettingsService);
  private confirmationDialog = inject(ConfirmationDialogService);
  readonly editIcon = LucidePenLine;
  readonly chatSettings = this.chatSettingsService.settings;

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
    if (this.sectionKey() === 'chats' && row.chatSettingKey === 'enterSendsMessage') {
      return this.chatSettings().enterSendsMessage;
    }

    return Boolean(row.checked);
  }

  rowDescription(row: SettingsRow): string {
    if (this.sectionKey() === 'chats' && row.chatSettingKey === 'enterSendsMessage') {
      return this.chatSettings().enterSendsMessage
        ? 'Use Shift + Enter for a new line'
        : 'Use Ctrl + Enter to send';
    }

    return row.description;
  }

  onToggleChange(row: SettingsRow, event: Event): void {
    const input = event.target as HTMLInputElement | null;

    if (!input) {
      return;
    }

    if (this.sectionKey() === 'chats' && row.chatSettingKey === 'enterSendsMessage') {
      this.chatSettingsService.updateSetting(row.chatSettingKey, input.checked);
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

    if (row.action === 'deleteAllChats') {
      await this.chatService.deleteAllChats();
    }
  }
}
