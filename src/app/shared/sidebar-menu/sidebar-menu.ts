import { Component, computed, input, output } from '@angular/core';
import { LucideIconData } from 'lucide-angular';

import { AppMenu, AppMenuItem } from '../app-menu/app-menu';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [AppMenu],
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.scss',
})
export class SidebarMenuComponent {
  menuIcon = input.required<LucideIconData>();
  isFullscreen = input.required<boolean>();
  enterFullscreenIcon = input.required<LucideIconData>();
  exitFullscreenIcon = input.required<LucideIconData>();

  fullscreenToggled = output<void>();

  menuItems = computed<AppMenuItem[]>(() => [
      {
        id: 'fullscreen',
        label: this.isFullscreen() ? 'Exit fullscreen' : 'Enter fullscreen',
        icon: this.isFullscreen() ? this.exitFullscreenIcon() : this.enterFullscreenIcon(),
      },
    ]);

  onMenuItemSelected(id: string): void {
    if (id === 'fullscreen') {
      this.fullscreenToggled.emit();
    }
  }
}
