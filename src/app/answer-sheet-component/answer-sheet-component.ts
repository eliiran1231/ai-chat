import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Check, LucideAngularModule, X } from 'lucide-angular';
import { Answer } from '../../classes/Answer';

const MIN_NUMBER_TO_SHOW_SEARCH = 15;

type SheetAnswerOption = {
  answer: Answer;
  index: number;
};

@Component({
  selector: 'app-answer-sheet',
  imports: [LucideAngularModule],
  templateUrl: './answer-sheet-component.html',
  styleUrl: './answer-sheet-component.scss',
})
export class AnswerSheetComponent {
  @Input({ required: true }) answers: Answer[] = [];
  @Input() isMultipleSelection = false;
  @Input() title = 'Choose an option';

  @Output() closed = new EventEmitter<void>();
  @Output() answerSelected = new EventEmitter<Answer>();
  @Output() answersConfirmed = new EventEmitter<Answer[]>();

  readonly closeIcon = X;
  readonly checkIcon = Check;
  selectedAnswerIndexes = new Set<number>();
  answerSearchTerm = '';

  close(): void {
    this.closed.emit();
  }

  selectAnswer(answer: Answer, answerIndex: number): void {
    if (this.isMultipleSelection) {
      this.toggleAnswer(answerIndex);
      return;
    }

    this.answerSelected.emit(answer);
  }

  toggleAnswer(answerIndex: number): void {
    if (this.selectedAnswerIndexes.has(answerIndex)) {
      this.selectedAnswerIndexes.delete(answerIndex);
      return;
    }

    this.selectedAnswerIndexes.add(answerIndex);
  }

  confirmAnswers(): void {
    if (!this.selectedAnswerIndexes.size) {
      return;
    }

    this.answersConfirmed.emit(
      this.answers.filter((_answer, index) => this.selectedAnswerIndexes.has(index))
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
      answer.value.toLocaleLowerCase().includes(normalizedSearchTerm)
    );
  }

  get shouldShowSearch(): boolean {
    return this.answers.length >= MIN_NUMBER_TO_SHOW_SEARCH;
  }
}
