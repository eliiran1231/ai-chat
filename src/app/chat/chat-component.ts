import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { ChatInputComponent } from '../chat-input-component/chat-input-component';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';
import { ImagePreviewComponent } from "../image-preview-component/image-preview-component";
import { Message } from '../../classes/Message';

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
  imageFile?: File;

  sendMessage(message: string | Message): void {
    if (!this.chat) {
      return;
    }
    const messageValue = typeof message === 'string' ? message : message.value;
    const messageAttachment = message instanceof Message ? message.attachment : undefined;

    if (this.chat.messages.at(-1) instanceof Question) {
      this.chat.user.answer(new Answer(messageValue, messageAttachment));
    } else {
      this.chat.user.ask(new Question(messageValue, {attachment: messageAttachment}));
    }
  }

  closePreviewPage(): void {
    this.imageFile = undefined;
  }

  openPreviewPage(image: File){
    console.log(image)
    this.imageFile = image;
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer));
  }
}
