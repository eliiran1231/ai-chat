import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { checkcheck } from '../../assets/icons/check-check';
import {
  LucideChevronDown,
  LucideDynamicIcon,
  LucideCheck,
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
import { QuestionAnswerControlsComponent } from '../question-answer-controls-component/question-answer-controls-component';
@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent, FilesizePipe, HighlightPipe, LucideDynamicIcon, QuestionAnswerControlsComponent],
  templateUrl: './message-bubble-component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() isActiveSearchMatch = false;
  @Input() isSelected = false;
  @Input() showTail = true;
  @Input() searchTerm = '';
  @Output() answerSelected = new EventEmitter<{ answer: Answer | Answer[]; associatedQuestion: Question }>();
  @Output() messageOptionsRequested = new EventEmitter<Message>();
  @Output() answerSheetOpenChange = new EventEmitter<boolean>();
  readonly statusIcons = {
    [MessageStatus.Pending]: LucideClock,
    [MessageStatus.Sent]: LucideCheck,
    [MessageStatus.Read]: checkcheck,
    [MessageStatus.Failed]: LucideCircleAlert,
  };

  questionType = Question;
  readonly optionsIcon = LucideChevronDown;

  constructor() {}

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message);
  }

  get hasMessageOptions(): boolean {
    return this.message.editable || this.message.deletable;
  }
}
