import { Component, computed, input, output } from '@angular/core';
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
  chats = input<Chat[]>([]);
  searchTerm = input<string>('');
  selectedChat = input<Chat | null>(null);

  openChat = output<Chat>();
  searchTermChange = output<string>();
  createChat = output<void>();

  filteredChats = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const chatsArray = !query
      ? [...this.chats()]
      : this.chats().filter((chat) => {
          const lastMessage = this.lastMessageText(chat).toLowerCase();
          return (
            chat.name().toLowerCase().includes(query) ||
            chat.status().toLowerCase().includes(query) ||
            lastMessage.includes(query)
          );
        });

    return chatsArray.sort(
      (a, b) =>
        (b.messages().at(-1)?.time?.()?.getTime() ?? 0) - (a.messages().at(-1)?.time?.()?.getTime() ?? 0),
    );
  });

  lastMessageText(chat: Chat): string {
    const lastMessage = chat.messages().at(-1);
    if (!lastMessage) {
      return chat.subtitle() || 'start the conversation';
    }

    return DOMPurify.sanitize(lastMessage.value() || lastMessage.attachment()?.name || '', {
      ALLOWED_TAGS: [],
    });
  }

  lastMessageTime(chat: Chat): string {
    const lastMessage = chat.messages().at(-1)?.time;
    return lastMessage
      ? lastMessage().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : chat.timeLabel() || '';
  }

  onOpenChat(chat: Chat): void {
    this.openChat.emit(chat);
  }

  onSearchTermChange(value: string): void {
    this.searchTermChange.emit(value);
  }

  onCreateChat(): void {
    this.createChat.emit();
  }
}
