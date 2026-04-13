import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Chat } from '../../classes/Chat';
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

    if (this.chat.messages.at(-1) instanceof Question) {
      this.chat.user.answer(trimmedMessage);
    } else {
      this.chat.user.ask(trimmedMessage);
    }
    this.chat.draftMessage = '';
  }

  messageText(message: Message): string {
    return typeof message.value === 'string' ? message.value : message.value.name;
  }

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  possibleAnswerLabel(answer: Answer | string): string {
    if (typeof answer === 'string') {
      return answer;
    }

    return typeof answer.value === 'string' ? answer.value : answer.value.name;
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer, 'user'));
  }
}
