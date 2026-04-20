import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chat } from '../../classes/Chat';

@Component({
  selector: 'app-chat-list-component',
  imports: [FormsModule],
  templateUrl: './chat-list-component.html',
  styleUrl: './chat-list-component.scss',
})
export class ChatListComponent {
  @Input({ required: true }) chats: Chat[] = [];
  @Input() searchTerm = '';
  @Input() selectedChat: Chat | null = null;
  @Input() deletingChatId: number | null = null;

  @Output() openChat = new EventEmitter<Chat>();
  @Output() deleteChat = new EventEmitter<Chat>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() createChat = new EventEmitter<void>();

  get filteredChats(): Chat[] {
    const query = this.searchTerm.trim().toLowerCase();
    if (!query) {
      return this.chats;
    }

    return this.chats.filter((chat) => {
      const lastMessage = this.lastMessageText(chat).toLowerCase();
      return (
        chat.name.toLowerCase().includes(query) ||
        chat.status.toLowerCase().includes(query) ||
        lastMessage.includes(query)
      );
    });
  }

  avatarFor(chat: Chat): string {
    return chat.avatar;
  }

  lastMessageText(chat: Chat): string {
    const lastMessage = chat.messages.at(-1);
    if (!lastMessage) {
      return chat.subtitle || 'start the conversation';
    }

    return lastMessage.value;
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

  onDeleteChat(chat: Chat, event: Event): void {
    event.stopPropagation();
    this.deleteChat.emit(chat);
  }

  onSearchTermChange(value: string): void {
    this.searchTerm = value;
    this.searchTermChange.emit(value);
  }

  onCreateChat(): void {
    this.createChat.emit();
  }
}
