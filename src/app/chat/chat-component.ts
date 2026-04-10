import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, MessageBubbleComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  @Input({ required: true }) chat: Chat | null = null;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();

  sendMessage(): void {
    if (!this.chat) {
      return;
    }

    const trimmedMessage = this.chat.draftMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    this.chat.user.answer(new Answer(trimmedMessage, 'user'));
    this.chat.draftMessage = '';
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer, 'user'));
  }
}
