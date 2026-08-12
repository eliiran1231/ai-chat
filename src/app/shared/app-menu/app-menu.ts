import { CdkMenuModule } from '@angular/cdk/menu';
import { Component, input, output } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';
import { TranslatePipe } from '../translate.pipe';

export interface AppMenuItem {
  label: string;
  icon?: LucideIconInput;
  id: string;
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CdkMenuModule, LucideDynamicIcon, TranslatePipe],
  templateUrl: './app-menu.html',
  styleUrl: './app-menu.scss',
})
export class AppMenu {
  menuIcon = input.required<LucideIconInput>();
  items = input.required<AppMenuItem[]>();

  itemSelected = output<string>();

  selectItem(id: string): void {
    this.itemSelected.emit(id);
  }
}
