import { Component, Injector, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat-component';
import { Chat } from '../../classes/chat';
import { ChatService } from '../../services/chat.service';
import { AiAgent } from '../../agents/AiAgent';
import { Agent } from '../../classes/Agent';
@Component({
  selector: 'app-chat-list',
  imports: [FormsModule, ChatComponent],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss',
})
export class HomeComponent implements OnInit {
  searchTerm = '';
  selectedChat: Chat | null = null;
  chats: Chat[] = [];
  isCreatingChat = false;
  deletingChatId: number | null = null;
  pendingCreateChat: Promise<Chat> | null = null;
  constructor(
      private chatService: ChatService,
      private injector: Injector,
    ) {
  }

  async ngOnInit(): Promise<void> {
    this.chats = await this.chatService.getChats(() => new AiAgent(this.injector));
  }

  
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

  async openChat(chat: Chat): Promise<void> {
    this.selectedChat = chat;
    chat.active = true;
    chat.unreadCount = 0;
    chat.messages.forEach((message) => (message.isRead = true));
    await this.chatService.markChatRead(chat.id);
  }

  closeChat(): void {
    if (!this.selectedChat) return;
    this.selectedChat.active = false;
    this.selectedChat = null;
  }

  async deleteChat(chat: Chat, event?: Event): Promise<void> {
    event?.stopPropagation();

    if (this.deletingChatId === chat.id) {
      return;
    }

    this.deletingChatId = chat.id;
    try {
      const deleted = await this.chatService.deleteChat(chat.id);
      if (!deleted) {
        return;
      }

      this.chats = this.chats.filter((existingChat) => existingChat.id !== chat.id);
      if (this.selectedChat?.id === chat.id) {
        this.selectedChat = null;
      }
    } finally {
      this.deletingChatId = null;
    }
  }

  async createNewChat(
    openChat = true,
    initialAgent: Agent = new AiAgent(this.injector),
  ): Promise<Chat> {
    if (this.isCreatingChat && this.pendingCreateChat) {
      return this.pendingCreateChat;
    }

    this.isCreatingChat = true;
    const chatNumber = this.chats.length + 1;
    this.pendingCreateChat = (async () => {
      const chat = await this.chatService.createChat(
        `New chat ${chatNumber}`,
        'Online now',
        initialAgent,
        {
          subtitle: 'Tap to start chatting',
          timeLabel: 'now',
        },
      );
      this.chats = [...this.chats, chat];
      if (openChat) await this.openChat(chat);
      return chat;
    })();

    try {
      return await this.pendingCreateChat;
    } finally {
      this.isCreatingChat = false;
      this.pendingCreateChat = null;
    }
  }

  avatarFor(chat: Chat): string {
    return chat.avatar;
  }

  lastMessageText(chat: Chat): string {
    const lastMessage = chat.messages.at(-1);
    if (!lastMessage) {
      return chat.subtitle || 'start the conversation';
    }

    return typeof lastMessage.value === 'string' ? lastMessage.value : lastMessage.value.name;
  }

  lastMessageTime(chat: Chat): string {
    const lastMessage = chat.messages.at(-1)?.time;
    return lastMessage
      ? lastMessage.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : chat.timeLabel || '';
  }
}
