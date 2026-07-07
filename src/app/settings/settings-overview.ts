import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideDynamicIcon } from '@lucide/angular';

import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings-overview',
  imports: [RouterLink, LucideDynamicIcon],
  templateUrl: './settings-overview.html',
  styleUrl: './settings-page.scss',
})
export class SettingsOverviewComponent {
  private settingsService = inject(SettingsService);

  readonly categories = this.settingsService.categories;
}
