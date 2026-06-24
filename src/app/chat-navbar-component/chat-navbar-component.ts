import { Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { AppMenu, AppMenuItem } from "../shared/app-menu/app-menu";
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronUp,
  LucideDynamicIcon,
  LucideEllipsisVertical,
  LucidePenLine,
  LucideRotateCcw,
  LucideSearch,
  LucideTrash2,
  LucideX,
} from '@lucide/angular';
import { MessageStatus } from '../../enums/MessagesStatus';

@Component({
  selector: 'app-chat-navbar-component',
  imports: [AppMenu, LucideDynamicIcon],
  templateUrl: './chat-navbar-component.html',
  styleUrl: './chat-navbar-component.scss',
})
export class ChatNavbarComponent {
  chat = input.required<Chat>();
  showBackButton = input(false);
  resultCount = input(0);
  currentResultIndex = input(-1);
  editMode = input(false);
  selectedMessage = input<Message | undefined>(undefined);
  back = output<void>();
  searchChange = output<string>();
  nextMatch = output<void>();
  previousMatch = output<void>();
  searchClosed = output<void>();
  messageOptionsClosed = output<void>();
  editMessage = output<Message>();
  deleteMessage = output<Message>();
  retryMessage = output<Message>();
  searchMode = signal(false);
  searchQuery = signal('');
  deleteChat = output<Chat>();
  
  readonly previousMatchIcon = LucideChevronUp;
  readonly nextMatchIcon = LucideChevronDown;
  readonly closeSearchIcon = LucideX;
  readonly backIcon = LucideChevronLeft;
  readonly searchIcon = LucideSearch;
  readonly editIcon = LucidePenLine;
  readonly menuIcon = LucideEllipsisVertical;
  readonly deleteIcon = LucideTrash2;
  readonly retryIcon = LucideRotateCcw;
  readonly messageStatus = MessageStatus;
  readonly menuItems: AppMenuItem[] = [
    {
      id: 'delete-chat',
      label: 'Delete chat',
      icon: this.deleteIcon,
      tone: 'danger',
    },
  ];

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  openSearch(): void {
    this.messageOptionsClosed.emit();
    this.searchMode.set(true);
    queueMicrotask(() => this.searchInput()?.nativeElement.focus());
  }

  onMenuItemSelected(id: string): void {
    if (id === 'delete-chat') {
      this.deleteChat.emit(this.chat());
    }
  }

  closeSearch(): void {
    this.searchMode.set(false);
    this.searchQuery.set('');
    this.searchClosed.emit();
  }

  updateSearch(input: string): void {
    this.searchQuery.set(input);
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

  hasResults = computed(() => this.resultCount() > 0);

  currentResultLabel = computed(() => {
    if (!this.hasResults() || this.currentResultIndex() < 0) {
      return '0/0';
    }

    return `${this.currentResultIndex() + 1}/${this.resultCount()}`;
  });

  messageOptionsMode = computed(() => !!this.selectedMessage() && !this.searchMode());

  canEditSelectedMessage = computed(() => this.selectedMessage()?.from() === 'client' && !!this.selectedMessage()?.editable());
}
