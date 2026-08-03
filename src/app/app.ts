import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DisplaySettingsService } from '../services/display-settings.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly languageService = inject(LanguageService);

  // The translate pipe is pure, so it only re-runs when its input changes. Keying the outlet on the
  // active language rebuilds the view once per language switch, which refreshes every translation
  // without paying the cost of an impure pipe on every change detection cycle.
  readonly activeLanguage = computed(() => [this.languageService.activeLanguageCode()]);

  constructor() {
    inject(DisplaySettingsService);
  }
}
