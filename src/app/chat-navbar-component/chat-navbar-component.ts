import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-chat-navbar-component',
  imports: [],
  templateUrl: './chat-navbar-component.html',
  styleUrl: './chat-navbar-component.scss',
})
export class ChatNavbarComponent {
  @Input({ required: true }) chat!: Chat;
  @Input() showBackButton = false;
  @Input() resultCount = 0;
  @Input() currentResultIndex = -1;
  @Output() back = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() nextMatch = new EventEmitter<void>();
  @Output() previousMatch = new EventEmitter<void>();
  @Output() searchClosed = new EventEmitter<void>();
  searchMode = false;
  searchQuery = '';

  openSearch(): void {
    this.searchMode = true;
  }

  closeSearch(): void {
    this.searchMode = false;
    this.searchQuery = '';
    this.searchClosed.emit();
  }

  updateSearch(input: string): void {
    this.searchQuery = input;
    this.searchChange.emit(input);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        this.previousMatch.emit();
        return;
      }

      this.nextMatch.emit();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSearch();
    }
  }

  get hasResults(): boolean {
    return this.resultCount > 0;
  }

  get currentResultLabel(): string {
    if (!this.hasResults || this.currentResultIndex < 0) {
      return '0/0';
    }

    return `${this.currentResultIndex + 1}/${this.resultCount}`;
  }
}
