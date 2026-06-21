import { CdkMenuModule } from '@angular/cdk/menu';
import { Component, input, output } from '@angular/core';
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
  menuIcon = input.required<LucideIconData>();
  items = input.required<AppMenuItem[]>();

  itemSelected = output<string>();

  selectItem(id: string): void {
    this.itemSelected.emit(id);
  }
}
