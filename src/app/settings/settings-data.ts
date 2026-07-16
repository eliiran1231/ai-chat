import { LucideIconInput } from '@lucide/angular';

import { BasicInfo } from '../../interfaces/BasicInfo';
import type { GeneralSettingKey } from '../../services/app-settings.service';
import type { ChatSettingKey } from '../../services/chat-settings.service';
import type { DisplaySettingKey } from '../../services/display-settings.service';
import type { NotificationSettingKey } from '../../services/notification-settings.service';

export type SettingsSectionKey =
  'general' | 'profile' | 'notifications' | 'chats' | 'appearance' | 'languages' | 'about';

export type SettingsIconKey =
  | 'settings'
  | 'user'
  | 'bell'
  | 'message-square'
  | 'palette'
  | 'languages'
  | 'info';

export type SettingsControlType = 'toggle' | 'select' | 'range' | 'button' | 'info';
export type SettingsAction = 'resetGeneralSettings' | 'deleteAllChats' | 'resetDisplayPreferences';

export interface SettingsConfirmation {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface SettingsCategoryConfig {
  path: SettingsSectionKey;
  title: string;
  description: string;
  icon: SettingsIconKey;
}

export interface SettingsCategory extends Omit<SettingsCategoryConfig, 'icon'> {
  icon: LucideIconInput;
}

export interface SettingsRow {
  label: string;
  description: string;
  control: SettingsControlType;
  value?: string;
  checked?: boolean;
  options?: string[];
  danger?: boolean;
  profileField?: keyof BasicInfo;
  settingKey?: GeneralSettingKey;
  chatSettingKey?: ChatSettingKey;
  displaySettingKey?: DisplaySettingKey;
  notificationSettingKey?: NotificationSettingKey;
  action?: SettingsAction;
  confirmation?: SettingsConfirmation;
}

export interface SettingsSection {
  title: string;
  description: string;
  rows: SettingsRow[];
}

export interface SettingsConfig {
  categories: SettingsCategoryConfig[];
  sections: Record<SettingsSectionKey, SettingsSection>;
}
