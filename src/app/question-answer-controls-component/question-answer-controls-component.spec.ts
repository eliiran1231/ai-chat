import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Question } from '../../classes/Question';
import { QuestionAnswerControlsComponent } from './question-answer-controls-component';

describe('QuestionAnswerControlsComponent', () => {
  let component: QuestionAnswerControlsComponent;
  let fixture: ComponentFixture<QuestionAnswerControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuestionAnswerControlsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionAnswerControlsComponent);
    component = fixture.componentInstance;
  });

  function renderQuestion(question: Question): void {
    fixture.componentRef.setInput('question', question);
    fixture.detectChanges();
  }

  function createQuestion(
    possibleAnswers: string[],
    answerSelectionMode: 'single' | 'multiple' = 'single',
  ): Question {
    return new Question('Choose', {
      possibleAnswers,
      answerSelectionMode,
    });
  }

  it('shows inline answer buttons for fewer than 10 single-select answers', () => {
    renderQuestion(createQuestion(['One', 'Two', 'Three']));

    const inlineAnswers = fixture.nativeElement.querySelectorAll(
      '.possible-answers-container--inline .possible-answer',
    );
    const sheetTrigger = fixture.nativeElement.querySelector('.possible-answer--sheet-trigger');

    expect(inlineAnswers).toHaveLength(3);
    expect(sheetTrigger).toBeNull();
  });

  it('shows the sheet trigger for 10 or more answers', () => {
    renderQuestion(createQuestion(Array.from({ length: 10 }, (_, index) => `Answer ${index}`)));

    const sheetTrigger = fixture.nativeElement.querySelector('.possible-answer--sheet-trigger');

    expect(sheetTrigger?.textContent).toContain('Choose an option');
  });

  it('shows the sheet trigger for multiple selection', () => {
    renderQuestion(createQuestion(['One', 'Two'], 'multiple'));

    const inlineAnswers = fixture.nativeElement.querySelector(
      '.possible-answers-container--inline .possible-answer',
    );
    const sheetTrigger = fixture.nativeElement.querySelector('.possible-answer--sheet-trigger');

    expect(inlineAnswers).toBeNull();
    expect(sheetTrigger).not.toBeNull();
  });

  it('emits selected inline answers with the associated question', () => {
    const question = createQuestion(['One', 'Two']);
    const selected: unknown[] = [];
    component.answerSelected.subscribe((event) => selected.push(event));
    renderQuestion(question);

    const firstAnswer = fixture.nativeElement.querySelector('.possible-answer') as HTMLButtonElement;
    firstAnswer.click();

    expect(selected).toEqual([
      {
        answer: question.possibleAnswers[0],
        associatedQuestion: question,
      },
    ]);
  });

  it('emits sheet open state changes', () => {
    const states: boolean[] = [];
    component.answerSheetOpenChange.subscribe((isOpen) => states.push(isOpen));
    renderQuestion(createQuestion(Array.from({ length: 10 }, (_, index) => `Answer ${index}`)));

    component.openAnswerSheet();
    component.closeAnswerSheet();

    expect(states).toEqual([true, false]);
  });
});
