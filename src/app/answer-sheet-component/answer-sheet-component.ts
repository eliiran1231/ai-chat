import {
  Component,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DialogRef, DIALOG_DATA, DialogCloseOptions } from '@angular/cdk/dialog';
import {
  LucideCheck,
  LucideDynamicIcon,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { Answer } from '../../classes/Answer';

const MIN_NUMBER_TO_SHOW_SEARCH = 15;

type SheetAnswerOption = {
  answer: Answer;
  index: number;
};

export type SheetAnswerInputs = {
  answers: Answer[];
  isMultipleSelection: boolean;
  title: string;
};

@Component({
  selector: 'app-answer-sheet',
  imports: [FormsModule, LucideDynamicIcon],
  templateUrl: './answer-sheet-component.html',
  styleUrl: './answer-sheet-component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AnswerSheetComponent {
  readonly dialogRef =
    inject<DialogRef<Answer | Answer[] | undefined>>(DialogRef);

  readonly data = inject<SheetAnswerInputs>(DIALOG_DATA);

  readonly closeIcon = LucideX;
  readonly checkIcon = LucideCheck;
  readonly searchIcon = LucideSearch;

  readonly answers = this.data.answers;
  readonly isMultipleSelection = this.data.isMultipleSelection;
  readonly title = this.data.title;

  selectedAnswerIndexes = new Set<number>();
  selectedSingleAnswerIndex: number | null = null;
  answerSearchTerm = '';
  isSearchOpen = false;
  isShown = signal(true);
  finalAnswers?: Answer[];

  constructor() {
    this.dialogRef.backdropClick.subscribe(() => {
      this.close()
      console.log(this.isShown);
    })
  }

  close(): void {
    this.isShown.set(false)
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
    this.close()
  }

  setAnswerSelected(answerIndex: number, isSelected: boolean): void {
    if (isSelected) {
      this.selectedAnswerIndexes.add(answerIndex);
      return;
    }

    this.selectedAnswerIndexes.delete(answerIndex);
  }

  toggleAnswer(answerIndex: number): void {
    this.setAnswerSelected(
      answerIndex,
      !this.selectedAnswerIndexes.has(answerIndex),
    );
  }

  confirmAnswers(_form?: NgForm): void {
    if (!this.selectedAnswerIndexes.size) {
      return;
    }

    this.finalAnswers = this.answers.filter((_answer, index) =>
      this.selectedAnswerIndexes.has(index)
    )
    this.close()
  }

  isAnswerSelected(answerIndex: number): boolean {
    return this.selectedAnswerIndexes.has(answerIndex);
  }

  get filteredAnswers(): SheetAnswerOption[] {
    const answers = this.answers.map((answer, index) => ({
      answer,
      index,
    }));

    const normalizedSearchTerm =
      this.answerSearchTerm.trim().toLocaleLowerCase();

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