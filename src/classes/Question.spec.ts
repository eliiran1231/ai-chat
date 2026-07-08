import { Answer } from './Answer';
import { Question } from './Question';

describe('Question', () => {
  it('normalizes RegExp validators and preserves validation behavior', () => {
    const question = new Question('Enter digits');
    question.setValidator(/^\d+$/);

    expect(question.validatorSpec()).toEqual({
      type: 'regex',
      pattern: '^\\d+$',
      flags: '',
    });
    expect(question.isAnswerValid(new Answer('1234'))).toBe(true);
    expect(question.isAnswerValid(new Answer('12ab'))).toBe(false);
  });
});
