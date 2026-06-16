import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { NgxFilesizeModule } from 'ngx-filesize';
import { Check, ChevronDown, List, LucideAngularModule, X } from 'lucide-angular';
import { Answer } from '../../classes/Answer';
import { Message } from '../../classes/Message';
import { DEFAULT_MIN_NUMBER_TO_SHOW_IN_SHEET, Question } from '../../classes/Question';
import { HighlightPipe } from '../../pipes/highlight.pipe';

const MIN_NUMBER_TO_SHOW_SEARCH = 15;

type SheetAnswerOption = {
  answer: Answer;
  index: number;
};

@Component({
  selector: 'app-message-bubble',
  imports: [DatePipe, MarkdownComponent, NgxFilesizeModule, HighlightPipe, LucideAngularModule],
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
  readonly closeIcon = X;
  readonly checkIcon = Check;
  isSheetOpen = false;
  selectedSheetAnswers = new Set<number>();
  answerSearchTerm = '';

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

    this.selectedSheetAnswers.clear();
    this.answerSearchTerm = '';
    this.isSheetOpen = true;
    this.answerSheetOpenChange.emit(true);
  }

  closeAnswerSheet(): void {
    this.isSheetOpen = false;
    this.selectedSheetAnswers.clear();
    this.answerSearchTerm = '';
    this.answerSheetOpenChange.emit(false);
  }

  selectSheetAnswer(answer: Answer, answerIndex: number): void {
    if (!(this.message instanceof Question)) {
      return;
    }

    if (this.message.answerOptions?.selectionMode === 'multiple') {
      this.toggleSheetAnswer(answerIndex);
      return;
    }

    this.selectAnswer(answer);
    this.closeAnswerSheet();
  }

  toggleSheetAnswer(answerIndex: number): void {
    if (this.selectedSheetAnswers.has(answerIndex)) {
      this.selectedSheetAnswers.delete(answerIndex);
      return;
    }

    this.selectedSheetAnswers.add(answerIndex);
  }

  confirmSheetAnswers(): void {
    if (!(this.message instanceof Question) || !this.selectedSheetAnswers.size) {
      return;
    }

    const selectedAnswerOptions = this.message.possibleAnswers.filter((_answer, index) =>
      this.selectedSheetAnswers.has(index)
    );

    this.answerSelected.emit({ answer: selectedAnswerOptions, associatedQuestion: this.message });
    this.closeAnswerSheet();
  }

  isSheetAnswerSelected(answerIndex: number): boolean {
    return this.selectedSheetAnswers.has(answerIndex);
  }

  get showInlineAnswers(): boolean {
    if (!(this.message instanceof Question) || !this.message.possibleAnswers.length) {
      return false;
    }

    const answerOptions = this.message.answerOptions;
    if (answerOptions?.selectionMode === 'multiple') {
      return false;
    }

    const minNumberToShowInSheet =
      answerOptions?.minNumberToShowInSheet ?? DEFAULT_MIN_NUMBER_TO_SHOW_IN_SHEET;
    return this.message.possibleAnswers.length < minNumberToShowInSheet;
  }

  get showSheetTrigger(): boolean {
    return this.message instanceof Question &&
      this.message.possibleAnswers.length > 0 &&
      !this.showInlineAnswers;
  }

  get sheetTitle(): string {
    return this.message instanceof Question
      ? this.message.answerOptions?.sheetTitle ?? 'Choose an option'
      : '';
  }

  get filteredSheetAnswers(): SheetAnswerOption[] {
    if (!(this.message instanceof Question)) {
      return [];
    }

    const answers = this.message.possibleAnswers.map((answer, index) => ({ answer, index }));
    const normalizedSearchTerm = this.answerSearchTerm.trim().toLocaleLowerCase();
    if (!normalizedSearchTerm) {
      return answers;
    }

    return answers.filter(({ answer }) =>
      answer.value.toLocaleLowerCase().includes(normalizedSearchTerm)
    );
  }

  get shouldShowAnswerSearch(): boolean {
    return this.message instanceof Question &&
      this.message.possibleAnswers.length >= MIN_NUMBER_TO_SHOW_SEARCH;
  }

  get isMultipleSelection(): boolean {
    return this.message instanceof Question &&
      this.message.answerOptions?.selectionMode === 'multiple';
  }

  openMessageOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.messageOptionsRequested.emit(this.message);
  }

  get hasMessageOptions(): boolean {
    return this.message.editable || this.message.deletable;
  }
}
