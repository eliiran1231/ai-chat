import { ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import { LucideIconInput } from '@lucide/angular';

import { AppMenu, AppMenuItem } from '../app-menu/app-menu';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [AppMenu],
  templateUrl: './sidebar-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './sidebar-menu.scss',
})
export class SidebarMenuComponent {
  menuIcon = input.required<LucideIconInput>();
  isFullscreen = input.required<boolean>();
  enterFullscreenIcon = input.required<LucideIconInput>();
  exitFullscreenIcon = input.required<LucideIconInput>();

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
