import { Component, Injector, OnInit } from '@angular/core';
import { ChatComponent } from '../chat/chat-component';
import { Chat } from '../../classes/Chat';
import { ChatService } from '../../services/chat.service';
import { Agent } from '../../classes/Agent';
import { ChatListComponent } from '../chat-list-component/chat-list-component';
import { ProfileComponent } from '../profile-component/profile-component';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../services/profile.service';
import { AiAgent } from '../../agents/AiAgent/AiAgent';

@Component({
  selector: 'app-home',
  imports: [ChatComponent, ChatListComponent, ProfileComponent, CommonModule],
  templateUrl: './home-component.html',
  styleUrl: './home-component.scss',
})
export class HomeComponent implements OnInit {
  searchTerm = '';
  // whatsappLogoUrl: string | null = 'image.png';
  whatsappLogoUrl?: string
  selectedChat: Chat | null = null;
  chats: Chat[] = [];
  isCreatingChat = false;
  deletingChatId: number | null = null;
  pendingCreateChat: Promise<Chat> | null = null;
  selectedTab: 'chats' | 'profile' | 'calls' = 'chats';
  constructor(
      private chatService: ChatService,
      private injector: Injector,
      private profileService: ProfileService,
    ) {
  }

  async ngOnInit(): Promise<void> {
    void this.profileService.loadBasicInfo();
    this.chats = await this.chatService.getChats();
  }

  get unreadChatsCount(): number {
    return this.chats.filter((chat) => chat.unreadCount > 0).length; // i know this is not the most efficient way to do this, but it works for now. We can optimize later if needed.
  }

  async openChat(chat: Chat): Promise<void> {
    this.selectedChat = chat;
    chat.active = true;
    await this.markChatRead(chat);
  }

  async markChatRead(chat: Chat): Promise<void> {
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
}
