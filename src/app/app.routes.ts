import { Routes } from '@angular/router';
import { HomeComponent } from './home/home-component';
import { SettingsLayoutComponent } from './settings/settings-layout';
import { SettingsOverviewComponent } from './settings/settings-overview';
import { SettingsSectionComponent } from './settings/settings-section';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chats',
    pathMatch: 'full',
  },
  {
    path: 'settings',
    component: SettingsLayoutComponent,
    children: [
      {
        path: '',
        component: SettingsOverviewComponent,
        pathMatch: 'full',
      },
      {
        path: 'general',
        component: SettingsSectionComponent,
        data: { section: 'general' },
      },
      {
        path: 'profile',
        component: SettingsSectionComponent,
        data: { section: 'profile' },
      },
      {
        path: 'notifications',
        component: SettingsSectionComponent,
        data: { section: 'notifications' },
      },
      {
        path: 'chats',
        component: SettingsSectionComponent,
        data: { section: 'chats' },
      },
      {
        path: 'appearance',
        component: SettingsSectionComponent,
        data: { section: 'appearance' },
      },
      {
        path: 'about',
        component: SettingsSectionComponent,
        data: { section: 'about' },
      },
    ],
  },
  {
    path: 'chats',
    component: HomeComponent,
  },
  {
    path: 'chats/:id',
    component: HomeComponent,
  },
];
