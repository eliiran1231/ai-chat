import { Component } from '@angular/core';
import { LucideDynamicIcon, LucideSettings } from '@lucide/angular';

@Component({
  selector: 'app-settings-overview',
  imports: [LucideDynamicIcon],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-page.scss',
})
export class SettingsOverviewComponent {
  readonly settingsIcon = LucideSettings;
}
