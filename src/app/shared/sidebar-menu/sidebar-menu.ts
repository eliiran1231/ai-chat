import { Component, computed, inject, input, output } from '@angular/core';
import { LucideIconInput, LucideSettings } from '@lucide/angular';

import { AppMenu, AppMenuItem } from '../app-menu/app-menu';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [AppMenu],
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.scss',
})
export class SidebarMenuComponent {
  private languageService = inject(LanguageService);
  menuIcon = input.required<LucideIconInput>();
  isFullscreen = input.required<boolean>();
  enterFullscreenIcon = input.required<LucideIconInput>();
  exitFullscreenIcon = input.required<LucideIconInput>();

  fullscreenToggled = output<void>();
  settingsOpened = output<void>();

  menuItems = computed<AppMenuItem[]>(() => [
    {
      id: 'settings',
      label: this.languageService.translate('settings.title'),
      icon: LucideSettings,
    },
    {
      id: 'fullscreen',
      label: this.isFullscreen()
        ? this.languageService.translate('app.exitFullscreen')
        : this.languageService.translate('app.enterFullscreen'),
      icon: this.isFullscreen() ? this.exitFullscreenIcon() : this.enterFullscreenIcon(),
    },
  ]);

  onMenuItemSelected(id: string): void {
    if (id === 'fullscreen') {
      this.fullscreenToggled.emit();
    }

    if (id === 'settings') {
      this.settingsOpened.emit();
    }
  }
}
