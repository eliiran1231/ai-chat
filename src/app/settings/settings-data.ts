import {
  LucideBell,
  LucideInfo,
  LucideMessageSquare,
  LucidePalette,
  LucideSettings,
  LucideUser,
  LucideIconInput,
} from '@lucide/angular';

import type { ChatSettingKey } from '../../services/chat-settings.service';

export interface SettingsCategory {
  path: SettingsSectionKey;
  title: string;
  description: string;
  icon: LucideIconInput;
}

export type SettingsSectionKey =
  'general' | 'profile' | 'notifications' | 'chats' | 'appearance' | 'about';

export type SettingsControlType = 'toggle' | 'select' | 'range' | 'button' | 'info';
export type SettingsAction = 'deleteAllChats';

export interface SettingsRow {
  label: string;
  description: string;
  control: SettingsControlType;
  value?: string;
  checked?: boolean;
  options?: string[];
  danger?: boolean;
  action?: SettingsAction;
  chatSettingKey?: ChatSettingKey;
}

export interface SettingsSection {
  title: string;
  description: string;
  rows: SettingsRow[];
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    path: 'general',
    title: 'General',
    description: 'Startup, language, background behavior, and text size.',
    icon: LucideSettings,
  },
  {
    path: 'profile',
    title: 'Profile',
    description: 'Name, profile photo, and account details.',
    icon: LucideUser,
  },
  {
    path: 'notifications',
    title: 'Notifications',
    description: 'Alerts, previews, timing, and notification sounds.',
    icon: LucideBell,
  },
  {
    path: 'chats',
    title: 'Chats',
    description: 'Message behavior, chat cleanup, and future chat options.',
    icon: LucideMessageSquare,
  },
  {
    path: 'appearance',
    title: 'Appearance',
    description: 'Theme, density, and display preferences.',
    icon: LucidePalette,
  },
  {
    path: 'about',
    title: 'About',
    description: 'App information and version details.',
    icon: LucideInfo,
  },
];

export const SETTINGS_SECTIONS: Record<SettingsSectionKey, SettingsSection> = {
  general: {
    title: 'General',
    description: 'Control startup behavior, reading comfort, and language preferences.',
    rows: [
      {
        label: 'Start at login',
        description: 'Open the app automatically when you sign in to this computer.',
        control: 'toggle',
      },
      {
        label: 'Run in background',
        description: 'Keep the app available after closing the main window.',
        control: 'toggle',
        checked: true,
      },
      {
        label: 'Font size',
        description: 'Adjust the size used for app and message text.',
        control: 'range',
        value: '16',
      },
      {
        label: 'Language',
        description: 'Choose the app display language.',
        control: 'select',
        value: 'English',
        options: ['English', 'Hebrew', 'Spanish', 'French'],
      },
    ],
  },
  profile: {
    title: 'Profile',
    description: 'Manage the details other people see when they chat with you.',
    rows: [
      {
        label: 'Display name',
        description: 'Natan',
        control: 'info',
      },
      {
        label: 'Username',
        description: 'Visible only inside this local app for now.',
        control: 'info',
      },
    ],
  },
  notifications: {
    title: 'Notifications',
    description: 'Decide when the app can notify you and what those alerts include.',
    rows: [
      {
        label: 'Enable notifications',
        description: 'Allow new message alerts.',
        control: 'toggle',
        checked: true,
      },
      {
        label: 'Notify me',
        description: 'Choose when notifications should appear.',
        control: 'select',
        value: 'Always',
        options: ['Always', 'Only when minimized', 'Never'],
      },
      {
        label: 'Show preview',
        description: 'Include message text in notification previews.',
        control: 'toggle',
        checked: true,
      },
      {
        label: 'Notification sound',
        description: 'Pick a custom sound for future notifications.',
        control: 'select',
        value: 'Default',
        options: ['Default', 'Soft', 'Bright', 'None'],
      },
    ],
  },
  chats: {
    title: 'Chats',
    description: 'Tune chat behavior and prepare common chat actions.',
    rows: [
      {
        label: 'Enter sends message',
        description: 'Use Shift + Enter for a new line',
        control: 'toggle',
        chatSettingKey: 'enterSendsMessage',
      },
      {
        label: 'Delete all chats',
        description: 'Permanently delete all chats and messages.',
        control: 'button',
        value: 'Delete',
        danger: true,
        action: 'deleteAllChats',
      },
    ],
  },
  appearance: {
    title: 'Appearance',
    description: 'Shape the look and density of the app.',
    rows: [
      {
        label: 'Theme',
        description: 'Choose the visual theme.',
        control: 'select',
        value: 'System',
        options: ['System', 'Light', 'Dark'],
      },
      {
        label: 'Display density',
        description: 'Control how compact lists and rows feel.',
        control: 'select',
        value: 'Comfortable',
        options: ['Comfortable', 'Compact', 'Spacious'],
      },
      {
        label: 'Message bubble style',
        description: 'Alternate chat styles can be connected later.',
        control: 'select',
        value: 'Default',
        options: ['Default', 'Rounded', 'Minimal'],
      },
    ],
  },
  about: {
    title: 'About',
    description: 'App details and local build information.',
    rows: [
      {
        label: 'Application',
        description: 'AI Chat',
        control: 'info',
      },
      {
        label: 'Version',
        description: '0.0.0',
        control: 'info',
      },
    ],
  },
};
