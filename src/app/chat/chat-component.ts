import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';
import { ImagePreviewComponent } from "../image-preview-component/image-preview-component";

@Component({
  selector: 'app-chat',
  imports: [MessageBubbleComponent, ChatInputComponent, ImagePreviewComponent],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  @Input({ required: true }) chat!: Chat;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();
  image?: string;

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

  imageSubmitted(imageUrl: string): void {
    this.image = undefined;
    this.chat.user.answer(imageUrl);
  }

  previewClosed(): void {
    this.image = undefined;
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
  }
}
