import { CdkMenuModule } from '@angular/cdk/menu';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule, LucideIconData } from 'lucide-angular';

export interface AppMenuItem {
  label: string;
  icon?: LucideIconData;
  id: string;
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CdkMenuModule, LucideAngularModule],
  templateUrl: './app-menu.html',
  styleUrl: './app-menu.scss',
})
export class AppMenu {
  @Input({ required: true }) menuIcon!: LucideIconData;
  @Input({ required: true }) items: AppMenuItem[] = [];
  @Input() ariaLabel = 'Menu';

  @Output() itemSelected = new EventEmitter<string>();

  selectItem(id: string): void {
    this.itemSelected.emit(id);
  }
}
