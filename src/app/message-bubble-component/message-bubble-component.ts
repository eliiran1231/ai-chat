import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { NgxFilesizeModule } from 'ngx-filesize';
import { ChevronDown, LucideAngularModule } from 'lucide-angular';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { QuestionAnswerControlsComponent } from '../question-answer-controls-component/question-answer-controls-component';

@Component({
  selector: 'app-message-bubble',
  imports: [
    DatePipe,
    MarkdownComponent,
    NgxFilesizeModule,
    HighlightPipe,
    LucideAngularModule,
    QuestionAnswerControlsComponent,
  ],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent {
  @Input({ required: true }) message!: Message;
  @Input() isActiveSearchMatch = false;
  @Input() isSelected = false;
  @Input() searchTerm = '';
  @Output() answerSelected = new EventEmitter<{ answer: Answer | Answer[]; associatedQuestion: Question }>();
  @Output() messageOptionsRequested = new EventEmitter<Message>();
  @Output() answerSheetOpenChange = new EventEmitter<boolean>();

  questionType = Question;
  readonly optionsIcon = ChevronDown;

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
