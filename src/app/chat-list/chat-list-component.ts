import { Component, NgZone, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../chat/chat-component';
import { Chat } from '../../classes/chat';
import { ChatService } from '../../services/chat.service';
import { AiAgent } from '../../agents/AiAgent';
import { AiService } from '../../services/ai.service';
import { Agent } from '../../classes/Agent';
@Component({
  selector: 'app-chat-list',
  imports: [FormsModule, ChatComponent],
  templateUrl: './chat-list-component.html',
  styleUrl: './chat-list-component.scss',
})
export class ChatListComponent implements OnInit {
  searchTerm = '';
  selectedChat: Chat | null = null;
  chats: Chat[] = [];
  isCreatingChat = false;
  pendingCreateChat: Promise<Chat> | null = null;
  constructor(
      private chatService: ChatService,
      private aiService: AiService,
      private ngZone: NgZone, 
    ) {
  }

  async ngOnInit(): Promise<void> {
    this.chats = await this.chatService.getChats(() => new AiAgent(this.aiService));
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

  openChat(chat: Chat): void {
    this.selectedChat = chat;
  }

  closeChat(): void {
    this.selectedChat = null;
  }

  async createNewChat(
    openChat = true,
    initialAgent: Agent = new AiAgent(this.aiService),
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
      if (openChat) this.openChat(chat);
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
    if (chat.subtitle) {
      return chat.subtitle;
    }

    const lastMessage = chat.messages.at(-1);
    if (!lastMessage) {
      return 'No messages yet';
    }

    return typeof lastMessage.value === 'string' ? lastMessage.value : lastMessage.value.name;
  }

  lastMessageTime(chat: Chat): string {
    if (chat.timeLabel) {
      return chat.timeLabel;
    }

    const lastMessage = chat.messages.at(-1)?.time;
    return lastMessage
      ? lastMessage.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : '';
  }
}
