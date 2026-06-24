import { DatePipe } from '@angular/common';
import { Inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';
import { getLocalDayNumber } from './chat-message-date-separator';

@Pipe({
  name: 'chatMessageDate',
  standalone: true,
})
export class ChatMessageDatePipe implements PipeTransform {
  private readonly datePipe: DatePipe;

  constructor(@Inject(LOCALE_ID) locale: string) {
    this.datePipe = new DatePipe(locale);
  }

  transform(messageDate: Date | null | undefined, referenceDate = new Date()): string {
    if (!messageDate) {
      return '';
    }

    const daysAgo = getLocalDayNumber(referenceDate) - getLocalDayNumber(messageDate);

    if (daysAgo === 0) {
      return 'Today';
    }

    if (daysAgo === 1) {
      return 'Yesterday';
    }

    if (daysAgo >= 2 && daysAgo <= 6) {
      return this.datePipe.transform(messageDate, 'EEEE') ?? '';
    }

    return this.datePipe.transform(messageDate, 'mediumDate') ?? '';
  }
}
