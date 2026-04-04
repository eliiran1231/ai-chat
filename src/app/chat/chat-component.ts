import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Chat } from '../../classes/chat';
import { Question } from '../../classes/Question';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, DatePipe],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  @Input({ required: true }) chat: Chat | null = null;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  questionType = Question;

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

  messageText(message: Message): string {
    return typeof message.value === 'string' ? message.value : message.value.name;
  }

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  selectAnswer(answer: Answer) {
    this.chat?.user.answer(answer);
  }
}
