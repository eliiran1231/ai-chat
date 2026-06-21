import { Message } from '../../classes/Message';

export class ChatMessageDateSeparator {
  private readonly dayNames = ['sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  private readonly fullDateFormatter = new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  shouldShowMessageTail(messages: Message[], index: number): boolean {
    const message = messages[index];
    const previousMessage = messages[index - 1];

    return (
      index === 0 ||
      previousMessage?.from !== message.from ||
      !this.isSameLocalDate(previousMessage.time, message.time)
    );
  }

  shouldShowDateSeparator(messages: Message[], index: number): boolean {
    const message = messages[index];
    const previousMessage = messages[index - 1];

    return index === 0 || !this.isSameLocalDate(previousMessage.time, message.time);
  }

  getDateSeparatorLabel(messageDate: Date, referenceDate = new Date()): string {
    const daysAgo = this.getLocalDayNumber(referenceDate) - this.getLocalDayNumber(messageDate);

    if (daysAgo === 0) {
      return 'Today';
    }

    if (daysAgo === 1) {
      return 'Yesterday';
    }

    if (daysAgo >= 2 && daysAgo <= 6) {
      return this.dayNames[messageDate.getDay()];
    }

    return this.fullDateFormatter.format(messageDate);
  }

  getDateIso(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
  }

  private isSameLocalDate(firstDate: Date, secondDate: Date): boolean {
    return this.getLocalDayNumber(firstDate) === this.getLocalDayNumber(secondDate);
  }

  private getLocalDayNumber(date: Date): number {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  }
}
