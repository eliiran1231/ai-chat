import { Message } from '../classes/Message';
import { Uuid } from '../interfaces/db/Uuid';
import { shouldShowDateSeparator, shouldShowMessageTail } from './chat-message-date-separator';

describe('ChatMessageDateSeparator', () => {
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

    expect(shouldShowDateSeparator(messages, 0)).toBe(true);
    expect(shouldShowDateSeparator(messages, 1)).toBe(false);
    expect(shouldShowDateSeparator(messages, 2)).toBe(true);
  });

  it('starts a new bubble group when the sender or date changes', () => {
    const messages = [
      createMessage('first', new Date(2026, 5, 15, 9), 'client'),
      createMessage('second', new Date(2026, 5, 15, 10), 'client'),
      createMessage('third', new Date(2026, 5, 15, 11), 'supporter'),
      createMessage('fourth', new Date(2026, 5, 16, 9), 'supporter'),
    ];

    expect(shouldShowMessageTail(messages, 0)).toBe(true);
    expect(shouldShowMessageTail(messages, 1)).toBe(false);
    expect(shouldShowMessageTail(messages, 2)).toBe(true);
    expect(shouldShowMessageTail(messages, 3)).toBe(true);
  });
});
