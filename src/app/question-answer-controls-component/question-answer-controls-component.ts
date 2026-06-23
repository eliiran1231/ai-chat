import { Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import {
  MatBottomSheet,
  MatBottomSheetModule,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { List, LucideAngularModule } from 'lucide-angular';
import { Answer } from '../../classes/Answer';
import { Question } from '../../classes/Question';
import { AnswerSheetComponent } from '../answer-sheet-component/answer-sheet-component';

const MIN_ANSWERS_TO_SHOW_IN_SHEET = 10;

@Component({
  selector: 'app-question-answer-controls',
  imports: [LucideAngularModule, MatBottomSheetModule],
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

  readonly listIcon = List;
  readonly answerSheetTitle = 'Choose an option';
  private readonly bottomSheet = inject(MatBottomSheet);
  private answerSheetRef?: MatBottomSheetRef<AnswerSheetComponent>;

  ngOnDestroy(): void {
    this.answerSheetRef?.dismiss();
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.question,
    });
  }

  openAnswerSheet(): void {
    const sheetRef = this.bottomSheet.open(AnswerSheetComponent, {
      ariaLabel: this.answerSheetTitle,
      panelClass: 'answer-sheet-panel',
      backdropClass: 'answer-sheet-backdrop',
    });

    this.answerSheetRef = sheetRef;
    sheetRef.instance.answers = this.question.possibleAnswers;
    sheetRef.instance.isMultipleSelection = this.isMultipleSelection;
    sheetRef.instance.title = this.answerSheetTitle;

    this.answerSheetOpenChange.emit(true);
    sheetRef.instance.closed.subscribe(() => sheetRef.dismiss());
    sheetRef.instance.answerSelected.subscribe((answer) => {
      this.selectAnswer(answer);
      sheetRef.dismiss();
    });
    sheetRef.instance.answersConfirmed.subscribe((answers) => {
      this.answerSelected.emit({ answer: answers, associatedQuestion: this.question });
      sheetRef.dismiss();
    });
    sheetRef.afterDismissed().subscribe(() => {
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
