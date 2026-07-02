import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Answer } from '../../classes/Answer';
import { AnswerSheetComponent } from './answer-sheet-component';

describe('AnswerSheetComponent', () => {
  let component: AnswerSheetComponent;
  let fixture: ComponentFixture<AnswerSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnswerSheetComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnswerSheetComponent);
    component = fixture.componentInstance;
  });

  function renderAnswers(answers: string[], isMultipleSelection = false): Answer[] {
    const answerModels = answers.map((answer) => new Answer(answer));
    fixture.componentRef.setInput('answers', answerModels);
    fixture.componentRef.setInput('isMultipleSelection', isMultipleSelection);
    fixture.detectChanges();
    return answerModels;
  }

  it('renders the sheet as an ngForm', () => {
    renderAnswers(['One']);

    const form = fixture.nativeElement.querySelector('form.answer-sheet') as HTMLFormElement | null;

    expect(form).not.toBeNull();
  });

  it('filters answers through the ngModel search field', async () => {
    renderAnswers(Array.from({ length: 15 }, (_, index) => `Answer ${index}`));

    const searchToggle = fixture.nativeElement.querySelector(
      '.answer-sheet__search-toggle',
    ) as HTMLButtonElement;
    searchToggle.click();
    fixture.detectChanges();

    const searchInput = fixture.nativeElement.querySelector(
      'input[name="answerSearchTerm"]',
    ) as HTMLInputElement;
    searchInput.value = '14';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.answer-sheet__option');

    expect(options).toHaveLength(1);
    expect(options[0].textContent).toContain('Answer 14');
  });

  it('emits a single answer from the radio control', async () => {
    const answers = renderAnswers(['One', 'Two']);

    const firstRadio = fixture.nativeElement.querySelector(
      'input[type="radio"]',
    ) as HTMLInputElement;
    firstRadio.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.finalAnswers).toEqual([answers[0]]);
  });

  it('confirms multiple answers from checkbox controls on submit', async () => {
    const answers = renderAnswers(['One', 'Two', 'Three'], true);

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change', { bubbles: true }));
    checkboxes[2].checked = true;
    checkboxes[2].dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const confirmButton = fixture.nativeElement.querySelector(
      '.answer-sheet__confirm',
    ) as HTMLButtonElement;
    confirmButton.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.finalAnswers).toEqual([answers[0], answers[2]]);
  });
});
