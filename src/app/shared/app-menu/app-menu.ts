import { CdkMenuModule } from '@angular/cdk/menu';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';

export interface AppMenuItem {
  label: string;
  icon?: LucideIconInput;
  id: string;
  tone?: 'default' | 'danger';
}

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CdkMenuModule, LucideDynamicIcon],
  templateUrl: './app-menu.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './app-menu.scss',
})
export class AppMenu {
  @Input({ required: true }) menuIcon!: LucideIconInput;
  @Input({ required: true }) items: AppMenuItem[] = [];

  @Output() itemSelected = new EventEmitter<string>();

  selectItem(id: string): void {
    this.itemSelected.emit(id);
  }
}
