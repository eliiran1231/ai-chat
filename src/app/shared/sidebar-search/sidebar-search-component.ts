import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideDynamicIcon, LucideSearch } from '@lucide/angular';

@Component({
  selector: 'app-sidebar-search',
  imports: [FormsModule, LucideDynamicIcon],
  templateUrl: './sidebar-search-component.html',
  styleUrl: './sidebar-search-component.scss',
})
export class SidebarSearchComponent {
  readonly searchIcon = LucideSearch;
  readonly searchTerm = input('');
  readonly placeholder = input('Search');
  readonly ariaLabel = input('Search');
  readonly searchTermChange = output<string>();
}
