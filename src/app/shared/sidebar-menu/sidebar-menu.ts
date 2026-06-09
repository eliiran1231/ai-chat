import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { LucideIconData } from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';

import { AppMenu, AppMenuItem } from '../app-menu/app-menu';
import { LanguageService } from '../../../services/language.service';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [AppMenu, TranslatePipe],
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.scss',
})
export class SidebarMenuComponent {
  readonly language = inject(LanguageService);
  @Input({ required: true }) menuIcon!: LucideIconData;
  @Input({ required: true }) isFullscreen = false;
  @Input({ required: true }) enterFullscreenIcon!: LucideIconData;
  @Input({ required: true }) exitFullscreenIcon!: LucideIconData;

  @Output() fullscreenToggled = new EventEmitter<void>();

  get menuItems(): AppMenuItem[] {
    return [
      {
        id: 'fullscreen',
        label: this.isFullscreen ? 'menu.exitFullscreen' : 'menu.enterFullscreen',
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
