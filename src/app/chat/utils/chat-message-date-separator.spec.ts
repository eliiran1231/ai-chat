import { Message } from '../../../classes/Message';
import { Uuid } from '../../../interfaces/db/Uuid';
import { ChatMessageDateSeparator } from './chat-message-date-separator';

describe('ChatMessageDateSeparator', () => {
  let dateSeparator: ChatMessageDateSeparator;

  beforeEach(() => {
    dateSeparator = new ChatMessageDateSeparator();
  });

  function createMessage(
    id: string,
    time: Date,
    from: 'client' | 'supporter' = 'client',
  ): Message {
    return new Message(id, { id: id as Uuid, time, from });
  }

  it('shows one date separator at the start of each message day', () => {
    const messages = [
      createMessage('first', new Date(2026, 5, 15, 9)),
      createMessage('second', new Date(2026, 5, 15, 10)),
      createMessage('third', new Date(2026, 5, 16, 9)),
    ];

    expect(dateSeparator.shouldShowDateSeparator(messages, 0)).toBe(true);
    expect(dateSeparator.shouldShowDateSeparator(messages, 1)).toBe(false);
    expect(dateSeparator.shouldShowDateSeparator(messages, 2)).toBe(true);
  });

  it('returns date formats for today, yesterday, weekdays and older dates', () => {
    const referenceDate = new Date(2026, 5, 17, 12);

    expect(dateSeparator.getDateFormat(new Date(2026, 5, 17, 9), referenceDate)).toBe("'Today'");
    expect(dateSeparator.getDateFormat(new Date(2026, 5, 16, 9), referenceDate)).toBe(
      "'Yesterday'",
    );
    expect(dateSeparator.getDateFormat(new Date(2026, 5, 15, 9), referenceDate)).toBe('EEEE');
    expect(dateSeparator.getDateFormat(new Date(2026, 5, 10, 9), referenceDate)).toBe(
      'mediumDate',
    );
  });

  it('starts a new bubble group when the sender or date changes', () => {
    const messages = [
      createMessage('first', new Date(2026, 5, 15, 9), 'client'),
      createMessage('second', new Date(2026, 5, 15, 10), 'client'),
      createMessage('third', new Date(2026, 5, 15, 11), 'supporter'),
      createMessage('fourth', new Date(2026, 5, 16, 9), 'supporter'),
    ];

    expect(dateSeparator.shouldShowMessageTail(messages, 0)).toBe(true);
    expect(dateSeparator.shouldShowMessageTail(messages, 1)).toBe(false);
    expect(dateSeparator.shouldShowMessageTail(messages, 2)).toBe(true);
    expect(dateSeparator.shouldShowMessageTail(messages, 3)).toBe(true);
  });
});
