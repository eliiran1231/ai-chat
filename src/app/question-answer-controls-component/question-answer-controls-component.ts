import { Component, EventEmitter, inject, Input, OnDestroy, Output, signal } from '@angular/core';
import { Dialog, DialogModule, DialogRef } from '@angular/cdk/dialog';
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
  @Input({ required: true }) question!: Question;
  @Output() answerSelected = new EventEmitter<{
    answer: Answer | Answer[];
    associatedQuestion: Question;
  }>();
  @Output() answerSheetOpenChange = new EventEmitter<boolean>();

  readonly listIcon = LucideList;
  readonly answerSheetTitle = 'Choose an option';
  private readonly dialog = inject(Dialog);
  private answerSheetRef?: DialogRef<Answer | Answer[] | undefined, AnswerSheetComponent>;

  ngOnDestroy(): void {
    this.answerSheetRef?.close();
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.question,
    });
  }

  openAnswerSheet(): void {
    const sheetRef = this.dialog.open<
      Answer | Answer[] | undefined, SheetAnswerInputs, AnswerSheetComponent
    >(AnswerSheetComponent, {
      panelClass: 'answer-sheet-panel',
      backdropClass: 'answer-sheet-backdrop',
      disableClose: true,
      data: {
        answers: this.question.possibleAnswers,
        isMultipleSelection: this.isMultipleSelection,
        title: this.answerSheetTitle,
      },
    });

    this.answerSheetRef = sheetRef;

    this.answerSheetOpenChange.emit(true);
    sheetRef.closed.subscribe((result) => {
      if (result) {
        this.answerSelected.emit({
          answer: result,
          associatedQuestion: this.question,
        });
      }

      if (this.answerSheetRef === sheetRef) {
        this.answerSheetRef = undefined;
      }

      this.answerSheetOpenChange.emit(false);
    });
  }

  get showInlineAnswers(): boolean {
    if (!this.question.possibleAnswers.length) {
      return false;
    }

    if (this.question.answerSelectionMode === 'multiple') {
      return false;
    }

    return this.question.possibleAnswers.length < MIN_ANSWERS_TO_SHOW_IN_SHEET;
  }

  get showSheetTrigger(): boolean {
    return this.question.possibleAnswers.length > 0 && !this.showInlineAnswers;
  }

  get isMultipleSelection(): boolean {
    return this.question.answerSelectionMode === 'multiple';
  }
}