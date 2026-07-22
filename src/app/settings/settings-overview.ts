import { Component } from '@angular/core';
import { LucideDynamicIcon, LucideSettings } from '@lucide/angular';
import { TranslatePipe } from '../shared/translate.pipe';

@Component({
  selector: 'app-settings-overview',
  imports: [LucideDynamicIcon, TranslatePipe],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-page.scss',
})
export class SettingsOverviewComponent {
  readonly settingsIcon = LucideSettings;
}
