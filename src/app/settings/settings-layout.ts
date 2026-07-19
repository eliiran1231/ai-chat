import { Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { LucideChevronLeft, LucideDynamicIcon } from '@lucide/angular';

import { SettingsService } from '../../services/settings.service';
import { TranslatePipe } from '../shared/translate.pipe';

@Component({
  selector: 'app-settings-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideDynamicIcon, TranslatePipe],
  templateUrl: './settings-layout.html',
  styleUrl: './settings-layout.scss',
})
export class SettingsLayoutComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private location = inject(Location);
  private settingsService = inject(SettingsService);

  readonly backIcon = LucideChevronLeft;
  readonly categories = this.settingsService.categories;

  private categoryPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      startWith(null),
      map(() => this.route.firstChild?.snapshot?.paramMap.get('category') ?? null),
    ),
    { initialValue: null },
  );

  readonly sectionOpen = computed(() => Boolean(this.categoryPath()));
  readonly pageTitle = computed(() => {
    const category = this.settingsService.getCategory(this.categoryPath());

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
