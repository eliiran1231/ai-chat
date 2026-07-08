import { LucideIconInput } from '@lucide/angular';

import { BasicInfo } from '../../interfaces/BasicInfo';
import type { DisplaySettingKey } from '../../services/display-settings.service';

export type SettingsSectionKey =
  'general' | 'profile' | 'notifications' | 'chats' | 'appearance' | 'languages' | 'about';

export type SettingsIconKey =
  'settings' | 'user' | 'bell' | 'message-square' | 'palette' | 'languages' | 'info';

export type SettingsControlType = 'toggle' | 'select' | 'range' | 'button' | 'info';
export type SettingsAction = 'resetDisplayPreferences';

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
  confirmation?: SettingsConfirmation;
  profileField?: keyof Pick<BasicInfo, 'displayName' | 'username'>;
  displaySettingKey?: DisplaySettingKey;
  action?: SettingsAction;
}

export interface SettingsConfirmation {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
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
