import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { Chat } from '../../classes/Chat';
import { Message } from '../../classes/Message';
import { AppMenu, AppMenuItem } from "../shared/app-menu/app-menu";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Edit3,
  EllipsisVertical,
  LucideIconData,
  LucideAngularModule,
  Search,
  Trash2,
  X,
} from 'lucide-angular';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-chat-navbar-component',
  imports: [AppMenu, LucideAngularModule, TranslatePipe],
  templateUrl: './chat-navbar-component.html',
  styleUrl: './chat-navbar-component.scss',
})
export class ChatNavbarComponent {
  readonly language = inject(LanguageService);
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
  searchMode = false;
  searchQuery = '';

  @Output() deleteChat = new EventEmitter<Chat>();
  readonly previousMatchIcon = ChevronUp;
  readonly nextMatchIcon = ChevronDown;
  readonly closeSearchIcon = X;
  readonly backLeftIcon = ChevronLeft;
  readonly backRightIcon = ChevronRight;
  readonly searchIcon = Search;
  readonly editIcon = Edit3;
  readonly menuIcon = EllipsisVertical;
  readonly deleteIcon = Trash2;

  get backIcon(): LucideIconData {
    return this.language.isRtl() ? this.backRightIcon : this.backLeftIcon;
  }

  menuItems: AppMenuItem[] = [
    {
      id: 'delete-chat',
      label: 'chat.deleteChat',
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
