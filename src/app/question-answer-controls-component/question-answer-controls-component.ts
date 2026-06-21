import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { List, LucideAngularModule } from 'lucide-angular';
import { Answer } from '../../classes/Answer';
import { Question } from '../../classes/Question';
import { AnswerSheetComponent } from '../answer-sheet-component/answer-sheet-component';

const MIN_ANSWERS_TO_SHOW_IN_SHEET = 10;

@Component({
  selector: 'app-question-answer-controls',
  imports: [AnswerSheetComponent, LucideAngularModule],
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
  isSheetOpen = false;

  ngOnDestroy(): void {
    if (this.isSheetOpen) {
      this.answerSheetOpenChange.emit(false);
    }
  }

  selectAnswer(answer: Answer): void {
    this.answerSelected.emit({
      answer,
      associatedQuestion: this.question,
    });
  }

  openAnswerSheet(): void {
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
    this.answerSelected.emit({ answer: answers, associatedQuestion: this.question });
    this.closeAnswerSheet();
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
