import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  LucideCheck,
  LucideCheckCheck,
  LucideClock,
  LucideCircleAlert
} from '@lucide/angular';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { AnswerSelectedEvent } from '../../classes/Client';
import { MessageStatus } from '../../enums/MessagesStatus';
import { FilesizePipe } from '../../pipes/filesize.pipe';
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent, FilesizePipe, HighlightPipe, LucideDynamicIcon],
  templateUrl: './message-bubble-component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() isActiveSearchMatch = false;
  @Input() isSelected = false;
  @Input() searchTerm = '';
  @Output() answerSelected = new EventEmitter<{ answer: Answer; associatedQuestion: Question }>();
  @Output() messageOptionsRequested = new EventEmitter<Message>();
  readonly statusIcons = {
    [MessageStatus.Pending]: LucideClock,
    [MessageStatus.Sent]: LucideCheck,
    [MessageStatus.Read]: LucideCheckCheck,
    [MessageStatus.Failed]: LucideCircleAlert,
  };

  questionType = Question;
  readonly optionsIcon = LucideChevronDown;

  constructor() {}

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.message as Question,
    });
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message);
  }

  get hasMessageOptions(): boolean {
    return this.message.editable || this.message.deletable;
  }
}
