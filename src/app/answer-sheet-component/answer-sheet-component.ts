import {
  Component,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import {
  LucideCheck,
  LucideDynamicIcon,
  LucideSearch,
  LucideX,
} from '@lucide/angular';
import { Answer } from '../../classes/Answer';
import { TranslatePipe } from '../shared/translate.pipe';

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
  imports: [FormsModule, LucideDynamicIcon, TranslatePipe],
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

  selectedAnswerIndexes = signal(new Set<number>());
  selectedSingleAnswerIndex = signal<number | null>(null);
  answerSearchTerm = signal('');
  isSearchOpen = signal(false);
  isShown = signal(true);
  finalAnswers?: Answer[];

  constructor() {
    this.dialogRef.backdropClick.subscribe(() => {
      this.close();
    });
  }

  close(): void {
    this.isShown.set(false);
  }

  openSearch(): void {
    this.isSearchOpen.set(true);
  }

  selectAnswer(answer: Answer, answerIndex: number): void {
    if (this.isMultipleSelection) {
      this.toggleAnswer(answerIndex);
      return;
    }

    this.selectedSingleAnswerIndex.set(answerIndex);
    this.finalAnswers = [answer];
    this.close();
  }

  setAnswerSelected(answerIndex: number, isSelected: boolean): void {
    this.selectedAnswerIndexes.update((selectedAnswerIndexes) => {
      const next = new Set(selectedAnswerIndexes);
      isSelected ? next.add(answerIndex) : next.delete(answerIndex);
      return next;
    });
  }

  toggleAnswer(answerIndex: number): void {
    this.setAnswerSelected(
      answerIndex,
      !this.selectedAnswerIndexes().has(answerIndex),
    );
  }

  confirmAnswers(_form?: NgForm): void {
    if (!this.selectedAnswerIndexes().size) {
      return;
    }

    this.finalAnswers = this.answers.filter((_answer, index) =>
      this.selectedAnswerIndexes().has(index)
    );
    this.close();
  }

  isAnswerSelected(answerIndex: number): boolean {
    return this.selectedAnswerIndexes().has(answerIndex);
  }

  filteredAnswers = computed<SheetAnswerOption[]>(() => {
    const answers = this.answers.map((answer, index) => ({
      answer,
      index,
    }));

    const normalizedSearchTerm =
      this.answerSearchTerm().trim().toLocaleLowerCase();

    if (!normalizedSearchTerm) {
      return answers;
    }

    return answers.filter(({ answer }) =>
      answer.value().toLocaleLowerCase().includes(normalizedSearchTerm),
    );
  });

  shouldShowSearch = computed(() => this.answers.length >= MIN_NUMBER_TO_SHOW_SEARCH);

  isTall = computed(() => this.answers.length >= MIN_NUMBER_TO_SHOW_SEARCH);
}
