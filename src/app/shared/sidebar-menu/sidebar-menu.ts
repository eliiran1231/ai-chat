import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkMenuModule } from '@angular/cdk/menu';
import { LucideAngularModule } from 'lucide-angular';
import { LucideIconData } from 'lucide-angular';

@Component({
  selector: 'app-sidebar-menu',
  standalone: true,
  imports: [CdkMenuModule, LucideAngularModule],
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.scss',
})
export class SidebarMenuComponent {
  @Input({ required: true }) isFullscreen = false;
  @Input({ required: true }) menuIcon!: LucideIconData;
  @Input({ required: true }) enterFullscreenIcon!: LucideIconData;
  @Input({ required: true }) exitFullscreenIcon!: LucideIconData;

  @Output() fullscreenToggled = new EventEmitter<void>();

  onToggleFullscreen(): void {
    this.fullscreenToggled.emit();
  }
}
