import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { LucideIconData } from 'lucide-angular';

import { AppMenu, AppMenuItem } from '../app-menu/app-menu';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [AppMenu],
  templateUrl: './sidebar-menu.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './sidebar-menu.scss',
})
export class SidebarMenuComponent {
  @Input({ required: true }) menuIcon!: LucideIconData;
  @Input({ required: true }) isFullscreen = false;
  @Input({ required: true }) enterFullscreenIcon!: LucideIconData;
  @Input({ required: true }) exitFullscreenIcon!: LucideIconData;

  @Output() fullscreenToggled = new EventEmitter<void>();

  get menuItems(): AppMenuItem[] {
    return [
      {
        id: 'fullscreen',
        label: this.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen',
        icon: this.isFullscreen ? this.exitFullscreenIcon : this.enterFullscreenIcon,
      },
    ];
  }

  onMenuItemSelected(id: string): void {
    if (id === 'fullscreen') {
      this.fullscreenToggled.emit();
    }
  }
}
