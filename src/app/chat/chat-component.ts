import { CdkTextareaAutosize, TextFieldModule } from '@angular/cdk/text-field';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Answer } from '../../classes/Answer';
import { Chat } from '../../classes/Chat';
import { MessageBubbleComponent } from '../message-bubble-component/message-bubble-component';
import { Question } from '../../classes/Question';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, TextFieldModule],
  templateUrl: './chat-component.html',
  styleUrl: './chat-component.scss',
})
export class ChatComponent {
  readonly composerMaxRows = 5;
  composerHasOverflow = false;

  @Input({ required: true }) chat: Chat | null = null;
  @Input() showBackButton = false;
  @Output() back = new EventEmitter<void>();

  sendMessage(form?: NgForm): void {
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
    this.composerHasOverflow = false;
    form?.resetForm({ message: '' });
  }

  selectAnswer(answer: Answer | string): void {
    this.chat?.user.answer(answer instanceof Answer ? answer : new Answer(answer, 'user'));
  }

  handleComposerKeydown(
    event: KeyboardEvent,
    _autosize: CdkTextareaAutosize,
    _textarea: HTMLTextAreaElement,
  ): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      (event.target as HTMLTextAreaElement).form?.requestSubmit();
    }
  }

  syncComposerOverflow(autosize: CdkTextareaAutosize, textarea: HTMLTextAreaElement): void {
    autosize.resizeToFitContent(true);
    this.composerHasOverflow = textarea.scrollHeight > textarea.clientHeight;
  }
}
