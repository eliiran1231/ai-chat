import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { NgxFilesizeModule } from 'ngx-filesize';
import { ChevronDown, List, LucideAngularModule } from 'lucide-angular';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';
import { AnswerSheetComponent } from '../answer-sheet-component/answer-sheet-component';

const MIN_ANSWERS_TO_SHOW_IN_SHEET = 10;

@Component({
  selector: 'app-message-bubble',
  imports: [
    AnswerSheetComponent,
    DatePipe,
    MarkdownComponent,
    NgxFilesizeModule,
    HighlightPipe,
    LucideAngularModule,
  ],
  templateUrl: './message-bubble-component.html',
  styleUrl: './message-bubble-component.scss',
})
export class MessageBubbleComponent implements OnDestroy {
  @Input({ required: true }) message!: Message;
  @Input() isActiveSearchMatch = false;
  @Input() isSelected = false;
  @Input() searchTerm = '';
  @Output() answerSelected = new EventEmitter<{ answer: Answer | Answer[]; associatedQuestion: Question }>();
  @Output() messageOptionsRequested = new EventEmitter<Message>();
  @Output() answerSheetOpenChange = new EventEmitter<boolean>();

  questionType = Question;
  readonly optionsIcon = ChevronDown;
  readonly listIcon = List;
  readonly answerSheetTitle = 'Choose an option';
  isSheetOpen = false;

  constructor() {}

  ngOnDestroy(): void {
    if (this.isSheetOpen) {
      this.answerSheetOpenChange.emit(false);
    }
  }

  isSupporterMessage(message: Message): boolean {
    return message.from === 'supporter';
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.message as Question,
    });
  }

  openAnswerSheet(): void {
    if (!(this.message instanceof Question)) {
      return;
    }

    this.isSheetOpen = true;
    this.answerSheetOpenChange.emit(true);
  }

  closeAnswerSheet(): void {
    this.isSheetOpen = false;
    this.answerSheetOpenChange.emit(false);
  }

  selectSheetAnswer(answer: Answer): void {
    this.selectAnswer(answer);
    this.closeAnswerSheet();
  }

  confirmSheetAnswers(answers: Answer[]): void {
    if (!(this.message instanceof Question)) {
      return;
    }

    this.answerSelected.emit({ answer: answers, associatedQuestion: this.message });
    this.closeAnswerSheet();
  }

  get showInlineAnswers(): boolean {
    if (!(this.message instanceof Question) || !this.message.possibleAnswers.length) {
      return false;
    }

    if (this.message.answerSelectionMode === 'multiple') {
      return false;
    }

    return this.message.possibleAnswers.length < MIN_ANSWERS_TO_SHOW_IN_SHEET;
  }

  get showSheetTrigger(): boolean {
    return this.message instanceof Question &&
      this.message.possibleAnswers.length > 0 &&
      !this.showInlineAnswers;
  }

  get isMultipleSelection(): boolean {
    return this.message instanceof Question &&
      this.message.answerSelectionMode === 'multiple';
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message);
  }

  get hasMessageOptions(): boolean {
    return this.message.editable || this.message.deletable;
  }
}
