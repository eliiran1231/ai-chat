import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LucideChevronLeft, LucideDynamicIcon } from '@lucide/angular';

import { SETTINGS_CATEGORIES } from './settings-data';

@Component({
  selector: 'app-settings-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideDynamicIcon],
  templateUrl: './settings-layout.html',
  styleUrl: './settings-layout.scss',
})
export class SettingsLayoutComponent {
  private router = inject(Router);
  private location = inject(Location);

  readonly backIcon = LucideChevronLeft;
  readonly categories = SETTINGS_CATEGORIES;

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly sectionOpen = computed(() => /^\/settings\/[^?]+/.test(this.currentUrl()));
  readonly pageTitle = computed(() => {
    const path = this.currentUrl().split('?')[0].split('/').at(-1);
    const category = this.categories.find((item) => item.path === path);

    return category?.title ?? 'Settings';
  });

  closeSettings(): Promise<boolean> | void {
    if (window.history.length <= 1) {
      return this.router.navigate(['/chats']);
    }

    this.location.back();
  }

  backToSettingsList(): Promise<boolean> {
    return this.router.navigate(['/settings'], { replaceUrl: true });
  }
}
