import { Component, OnDestroy, computed, inject, input, output } from '@angular/core';
import { Dialog, DialogModule, DialogRef } from '@angular/cdk/dialog';
import { Overlay } from '@angular/cdk/overlay';
import { LucideDynamicIcon, LucideList } from '@lucide/angular';
import { Answer } from '../../classes/Answer';
import { Question } from '../../classes/Question';
import { AnswerSheetComponent, SheetAnswerInputs } from '../answer-sheet-component/answer-sheet-component';

const MIN_ANSWERS_TO_SHOW_IN_SHEET = 10;

@Component({
  selector: 'app-question-answer-controls',
  imports: [LucideDynamicIcon,  DialogModule],
  templateUrl: './question-answer-controls-component.html',
  styleUrl: './question-answer-controls-component.scss',
})
export class QuestionAnswerControlsComponent implements OnDestroy {
  question = input.required<Question>();
  answerSelected = output<{
    answer: Answer | Answer[];
    associatedQuestion: Question;
  }>();
  answerSheetOpenChange = output<boolean>();

  readonly listIcon = LucideList;
  readonly answerSheetTitle = 'Choose an option';
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);
  private answerSheetRef?: DialogRef<Answer | Answer[] | undefined, AnswerSheetComponent>;

  ngOnDestroy(): void {
    this.answerSheetRef?.close();
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.question(),
    });
  }

  openAnswerSheet(): void {
    const sheetRef = this.dialog.open<
      Answer | Answer[] | undefined, SheetAnswerInputs, AnswerSheetComponent
    >(AnswerSheetComponent, {
      backdropClass: 'answer-sheet-backdrop',
      disableClose: true,
      width: '100%',
      maxWidth: '50rem',
      positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
      data: {
        answers: this.question().possibleAnswers(),
        isMultipleSelection: this.isMultipleSelection(),
        title: this.answerSheetTitle,
      },
    });

    this.answerSheetRef = sheetRef;

    this.answerSheetOpenChange.emit(true);
    sheetRef.closed.subscribe((result) => {
      if (result) {
        this.answerSelected.emit({
          answer: result,
          associatedQuestion: this.question(),
        });
      }

      if (this.answerSheetRef === sheetRef) {
        this.answerSheetRef = undefined;
      }

      this.answerSheetOpenChange.emit(false);
    });
  }

  showInlineAnswers = computed(() => {
    if (!this.question().possibleAnswers().length) {
      return false;
    }

    if (this.question().answerSelectionMode() === 'multiple') {
      return false;
    }

    return this.question().possibleAnswers().length < MIN_ANSWERS_TO_SHOW_IN_SHEET;
  });

  showSheetTrigger = computed(() => this.question().possibleAnswers().length > 0 && !this.showInlineAnswers());

  isMultipleSelection = computed(() => this.question().answerSelectionMode() === 'multiple');
}
