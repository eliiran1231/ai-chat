import { Component, EventEmitter, Inject, Input, Output, ViewEncapsulation } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { LucideCheck, LucideDynamicIcon, LucideSearch, LucideX } from '@lucide/angular';
import { Answer } from '../../classes/Answer';
import { MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';

const MIN_NUMBER_TO_SHOW_SEARCH = 15;

type SheetAnswerOption = {
  answer: Answer;
  index: number;
};

type SheetAnswerInputs = {
  answers: Answer[],
  isMultipleSelection: boolean,
  title: string
}

@Component({
  selector: 'app-answer-sheet',
  imports: [FormsModule, LucideDynamicIcon],
  templateUrl: './answer-sheet-component.html',
  styleUrl: './answer-sheet-component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AnswerSheetComponent {
  @Input() answers: Answer[] = [];
  @Input() isMultipleSelection = false;
  @Input() title = 'Choose an option';

  @Output() closed = new EventEmitter<void>();
  @Output() answerSelected = new EventEmitter<Answer>();
  @Output() answersConfirmed = new EventEmitter<Answer[]>();

  constructor(@Inject(MAT_BOTTOM_SHEET_DATA) public data: SheetAnswerInputs){
    this.answers = data.answers;
    this.isMultipleSelection = data.isMultipleSelection;
    this.title = data.title;
  }

  readonly closeIcon = LucideX;
  readonly checkIcon = LucideCheck;
  readonly searchIcon = LucideSearch;
  selectedAnswerIndexes = new Set<number>();
  selectedSingleAnswerIndex: number | null = null;
  answerSearchTerm = '';
  isSearchOpen = false;

  close(): void {
    this.closed.emit();
    console.log(this.answers);
  }

  openSearch(): void {
    this.isSearchOpen = true;
  }

  selectAnswer(answer: Answer, answerIndex: number): void {
    
    if (this.isMultipleSelection) {
      this.toggleAnswer(answerIndex);
      return;
    }

    this.selectedSingleAnswerIndex = answerIndex;
    this.answerSelected.emit(answer);

  }

  setAnswerSelected(answerIndex: number, isSelected: boolean): void {
    if (isSelected) {
      this.selectedAnswerIndexes.add(answerIndex);
      return;
    }

    this.selectedAnswerIndexes.delete(answerIndex);
  }

  toggleAnswer(answerIndex: number): void {
    this.setAnswerSelected(answerIndex, !this.selectedAnswerIndexes.has(answerIndex));
  }

  confirmAnswers(_form?: NgForm): void {
    if (!this.selectedAnswerIndexes.size) {
      return;
    }

    this.answersConfirmed.emit(
      this.answers.filter((_answer, index) => this.selectedAnswerIndexes.has(index)),
    );
  }

  isAnswerSelected(answerIndex: number): boolean {
    return this.selectedAnswerIndexes.has(answerIndex);
  }

  get filteredAnswers(): SheetAnswerOption[] {
    const answers = this.answers.map((answer, index) => ({ answer, index }));
    const normalizedSearchTerm = this.answerSearchTerm.trim().toLocaleLowerCase();
    if (!normalizedSearchTerm) {
      return answers;
    }

    return answers.filter(({ answer }) =>
      answer.value.toLocaleLowerCase().includes(normalizedSearchTerm),
    );
  }

  get shouldShowSearch(): boolean {
    return this.answers.length >= MIN_NUMBER_TO_SHOW_SEARCH;
  }

  get isTall(): boolean {
    return this.answers.length >= MIN_NUMBER_TO_SHOW_SEARCH;
  }
}
