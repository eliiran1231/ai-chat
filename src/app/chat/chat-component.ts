import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';

@Component({
  selector: 'app-chat',
  imports: [MessageBubbleComponent, ChatInputComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  @Input({ required: true }) chat: Chat | null = null;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();

  sendMessage(message: string): void {
    if (!this.chat) {
      return;
    }

    if (this.chat.messages.at(-1) instanceof Question) {
      this.chat.user.answer(message);
    } else {
      this.chat.user.ask(message);
    }
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
  }
}
