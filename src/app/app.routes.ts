import { Routes } from '@angular/router';
import { HomeComponent } from './home/home-component';
import { SettingsLayoutComponent } from './settings/settings-layout';
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
        path: ':category',
        component: SettingsSectionComponent,
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
