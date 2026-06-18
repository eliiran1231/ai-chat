import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { AppMenu, AppMenuItem } from "../shared/app-menu/app-menu";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  EllipsisVertical,
  LucideAngularModule,
  PenLine,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { MessageStatus } from '../../enums/MessagesStatus';

@Component({
  selector: 'app-chat-navbar-component',
  imports: [AppMenu, LucideAngularModule],
  templateUrl: './chat-navbar-component.html',
  styleUrl: './chat-navbar-component.scss',
})
export class ChatNavbarComponent {
  @Input({ required: true }) chat!: Chat;
  @Input() showBackButton = false;
  @Input() resultCount = 0;
  @Input() currentResultIndex = -1;
  @Input() editMode = false;
  private _selectedMessage?: Message;
  @Input() set selectedMessage(message: Message | undefined) {
    this._selectedMessage = message;
    if (message) {
      this.searchMode = false;
    }
  }
  get selectedMessage(): Message | undefined {
    return this._selectedMessage;
  }
  @Output() back = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();
  @Output() nextMatch = new EventEmitter<void>();
  @Output() previousMatch = new EventEmitter<void>();
  @Output() searchClosed = new EventEmitter<void>();
  @Output() messageOptionsClosed = new EventEmitter<void>();
  @Output() editMessage = new EventEmitter<Message>();
  @Output() deleteMessage = new EventEmitter<Message>();
  @Output() retryMessage = new EventEmitter<Message>();
  searchMode = false;
  searchQuery = '';

  @Output() deleteChat = new EventEmitter<Chat>();
  readonly previousMatchIcon = ChevronUp;
  readonly nextMatchIcon = ChevronDown;
  readonly closeSearchIcon = X;
  readonly backIcon = ChevronLeft;
  readonly searchIcon = Search;
  readonly editIcon = PenLine;
  readonly menuIcon = EllipsisVertical;
  readonly deleteIcon = Trash2;
  readonly retryIcon = RotateCcw;
  readonly messageStatus = MessageStatus;
  readonly menuItems: AppMenuItem[] = [
    {
      id: 'delete-chat',
      label: 'Delete chat',
      icon: this.deleteIcon,
      tone: 'danger',
    },
  ];

  @ViewChild('searchInput') set inputRef(searchInput: ElementRef) {
    this.searchMode && searchInput.nativeElement.focus();
  }
  openSearch(): void {
    this.messageOptionsClosed.emit();
    this.searchMode = true;
  }

  onMenuItemSelected(id: string): void {
    if (id === 'delete-chat' && this.chat) {
      this.deleteChat.emit(this.chat);
    }
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

  get messageOptionsMode(): boolean {
    return !!this.selectedMessage && !this.searchMode;
  }

  get canEditSelectedMessage(): boolean {
    return this.selectedMessage?.from === 'client' && this.selectedMessage.editable;
  }
}
