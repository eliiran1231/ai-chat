import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideDynamicIcon, LucidePenLine } from '@lucide/angular';
import { map } from 'rxjs';

import { SettingsRow } from './settings-data';
import { SettingsRowComponent } from './settings-row';
import { ConfirmationDialogService } from '../shared/confirmation-dialog/confirmation-dialog.service';
import { ProfileAvatarComponent } from '../shared/profile-avatar/profile-avatar';
import { AppSettingsService } from '../../services/app-settings.service';
import { ChatService } from '../../services/chat.service';
import { ChatSettingsService } from '../../services/chat-settings.service';
import {
  DisplayDensity,
  DisplaySettingKey,
  DisplaySettingsService,
  DisplayTheme,
  MessageBubbleStyle,
} from '../../services/display-settings.service';
import { NotificationSettingsService } from '../../services/notification-settings.service';
import { ProfileService } from '../../services/profile.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-section',
  imports: [ProfileAvatarComponent, SettingsRowComponent, LucideDynamicIcon],
  templateUrl: './settings-section.html',
  styleUrl: './settings-page.scss',
})
export class SettingsSectionComponent {
  private route = inject(ActivatedRoute);
  private confirmationDialog = inject(ConfirmationDialogService);
  private appSettingsService = inject(AppSettingsService);
  private chatService = inject(ChatService);
  private chatSettingsService = inject(ChatSettingsService);
  private displaySettingsService = inject(DisplaySettingsService);
  private notificationSettingsService = inject(NotificationSettingsService);
  private profileService = inject(ProfileService);
  private settingsService = inject(SettingsService);

  readonly editIcon = LucidePenLine;
  readonly chatSettings = this.chatSettingsService.settings;
  readonly displaySettings = this.displaySettingsService.settings;
  readonly fontSizeDraft = signal(this.displaySettings().fontSize);
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

  rowDescription(row: SettingsRow): string {
    if (this.sectionKey() === 'chats' && row.chatSettingKey === 'enterSendsMessage') {
      return this.chatSettings().enterSendsMessage
        ? 'Use Shift + Enter for a new line'
        : 'Use Ctrl + Enter to send';
    }

    return row.description;
  }

  isToggleChecked(row: SettingsRow): boolean {
    if (this.sectionKey() === 'general' && row.settingKey) {
      return this.generalSettings()[row.settingKey];
    }

    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      const value = this.notificationSettings()[row.notificationSettingKey];
      return typeof value === 'boolean' ? value : false;
    }

    if (this.sectionKey() === 'chats' && row.chatSettingKey) {
      return this.chatSettings()[row.chatSettingKey];
    }

    return Boolean(row.checked);
  }

  selectValue(row: SettingsRow): string {
    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      return String(this.notificationSettings()[row.notificationSettingKey]);
    }

    if (row.displaySettingKey && row.displaySettingKey !== 'fontSize') {
      return String(this.displaySettings()[row.displaySettingKey]);
    }

    return row.value ?? '';
  }

  rangeValue(row: SettingsRow): number {
    if (row.displaySettingKey === 'fontSize') {
      return this.fontSizeDraft();
    }

    return Number(row.value ?? 0);
  }

  isControlDisabled(row: SettingsRow): boolean {
    return (
      this.sectionKey() === 'notifications' &&
      row.notificationSettingKey !== undefined &&
      row.notificationSettingKey !== 'enableNotifications' &&
      !this.notificationSettings().enableNotifications
    );
  }

  onToggleChange(row: SettingsRow, checked: boolean): void {
    if (this.sectionKey() === 'general' && row.settingKey) {
      void this.appSettingsService.updateGeneralSetting(row.settingKey, checked);
      return;
    }

    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      this.notificationSettingsService.updateSetting(row.notificationSettingKey, checked);
      return;
    }

    if (this.sectionKey() === 'chats' && row.chatSettingKey) {
      this.chatSettingsService.updateSetting(row.chatSettingKey, checked);
      return;
    }

    row.checked = checked;
  }

  onSelectChange(row: SettingsRow, value: string): void {
    if (this.sectionKey() === 'notifications' && row.notificationSettingKey) {
      this.notificationSettingsService.updateSetting(row.notificationSettingKey, value);
      return;
    }

    if (row.displaySettingKey && row.displaySettingKey !== 'fontSize') {
      this.updateDisplaySetting(row.displaySettingKey, value);
      return;
    }

    row.value = value;
  }

  onRangeInput(row: SettingsRow, value: number): void {
    if (row.displaySettingKey === 'fontSize') {
      this.fontSizeDraft.set(value);
      return;
    }

    row.value = String(value);
  }

  applyRange(row: SettingsRow): void {
    if (row.displaySettingKey === 'fontSize') {
      this.displaySettingsService.updateSetting(row.displaySettingKey, this.fontSizeDraft());
    }
  }

  async onButtonClick(row: SettingsRow): Promise<void> {
    if (row.confirmation && !(await this.confirmationDialog.confirm(row.confirmation))) {
      return;
    }

    if (row.action === 'resetGeneralSettings') {
      await this.appSettingsService.resetGeneralSettings();
      return;
    }

    if (row.action === 'resetDisplayPreferences') {
      this.displaySettingsService.resetSettings();
      this.fontSizeDraft.set(this.displaySettings().fontSize);
      return;
    }

    if (row.action === 'deleteAllChats') {
      await this.chatService.deleteAllChats();
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
