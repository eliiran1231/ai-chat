import { Component, computed, inject } from '@angular/core';
import { Dialog, DialogModule } from '@angular/cdk/dialog';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { firstValueFrom, map } from 'rxjs';

import { SETTINGS_SECTIONS, SettingsRow, SettingsSectionKey } from './settings-data';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { ChatService } from '../../services/chat.service';
import { ChatSettingsService } from '../../services/chat-settings.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, LucideDynamicIcon, DialogModule],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private dialog = inject(Dialog);
  private chatService = inject(ChatService);
  private chatSettingsService = inject(ChatSettingsService);
  readonly editIcon = LucidePenLine;
  readonly chatSettings = this.chatSettingsService.settings;

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
    if (row.action !== 'deleteAllChats') {
      return;
    }

    const dialogRef = this.dialog.open<boolean | undefined, unknown, ConfirmDialogComponent>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete all chats?',
          message: 'This will permanently delete all chats and their messages.',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel',
          danger: true,
        },
      },
    );
    const confirmed = await firstValueFrom(dialogRef.closed);

    if (confirmed) {
      await this.chatService.deleteAllChats();
    }
  }
}
