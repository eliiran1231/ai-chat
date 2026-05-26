import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, SquarePen } from 'lucide-angular';
import { Chat } from '../../classes/Chat';
import DOMPurify from 'dompurify';
@Component({
  selector: 'app-chat-list-component',
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './chat-list-component.html',
  styleUrl: './chat-list-component.scss',
})
export class ChatListComponent {
  readonly searchIcon = Search;
  readonly composeIcon = SquarePen;
  @Input({ required: true }) chats: Chat[] = [];
  @Input() searchTerm = '';
  @Input() selectedChat: Chat | null = null;

  @Output() openChat = new EventEmitter<Chat>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() createChat = new EventEmitter<void>();

  get filteredChats(): Chat[] {
    const query = this.searchTerm.trim().toLowerCase();
    const chats = !query
      ? [...this.chats]
      : this.chats.filter((chat) => {
          const lastMessage = this.previewText(chat).toLowerCase();
          return (
            chat.name.toLowerCase().includes(query) ||
            chat.status.toLowerCase().includes(query) ||
            lastMessage.includes(query)
          );
        });

    return chats.sort(
      (a, b) => (b.messages.at(-1)?.time?.getTime() ?? 0) - (a.messages.at(-1)?.time?.getTime() ?? 0),
    );
  }

  avatarFor(chat: Chat): string {
    return chat.avatar;
  }

  lastMessageText(chat: Chat): string {
    const lastMessage = chat.messages.at(-1);
    if (!lastMessage) {
      return chat.subtitle || 'start the conversation';
    }

    return DOMPurify.sanitize(
      lastMessage.value || 
      lastMessage.attachment?.name || 
      '', 
      { ALLOWED_TAGS: [] }
    );
  }

  hasDraft(chat: Chat): boolean {
    return !!chat.draftMessage.trim();
  }

  draftText(chat: Chat): string {
    return chat.draftMessage.trim();
  }

  draftLabel(chat: Chat): string {
    return 'Draft:';//todo: add hebrew support after marging with hebrew branch
  }

  previewText(chat: Chat): string {
    if (this.hasDraft(chat)) {
      return `${this.draftLabel(chat)} ${this.draftText(chat)}`;
    }

    return this.lastMessageText(chat);
  }

  lastMessageTime(chat: Chat): string {
    const lastMessage = chat.messages.at(-1)?.time;
    return lastMessage
      ? lastMessage.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : chat.timeLabel || '';
  }

  onOpenChat(chat: Chat): void {
    this.openChat.emit(chat);
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTermChange.emit(value);
  }

  onCreateChat(): void {
    this.createChat.emit();
  }
}
