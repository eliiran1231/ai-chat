import { Message } from '../classes/Message';

export function shouldShowMessageTail(messages: Message[], index: number): boolean {
  const message = messages[index];
  const previousMessage = messages[index - 1];

  return (
    index === 0 ||
    previousMessage?.from() !== message.from() ||
    !isSameLocalDate(previousMessage.time(), message.time())
  );
}

export function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  const message = messages[index];
  const previousMessage = messages[index - 1];

  return index === 0 || !isSameLocalDate(previousMessage.time(), message.time());
}

export function getLocalDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function isSameLocalDate(firstDate: Date, secondDate: Date): boolean {
  return getLocalDayNumber(firstDate) === getLocalDayNumber(secondDate);
}
